"""
Document generation and management router
"""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from ..database import get_db
from ..models import DocumentVersion, Project, User, RiskManagementTable, RiskTableRow, ProjectMember
from ..schemas.document import (
    DocumentVersionResponse,
    DocumentVersionList,
    GenerateDocumentRequest
)
from .auth import get_current_user, get_current_active_user
from .projects import check_project_access, check_user_permission
from ..services.document_generator import RiskManagementReportGenerator


router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/projects/{project_id}/generate", response_model=DocumentVersionResponse)
async def generate_document(
    project_id: int,
    request: GenerateDocumentRequest,
    format: str = "docx",  # Add format parameter
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new version of the Risk Management Report document
    """
    # Check if project exists and user has access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check user access to project
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied to this project")

    # Check verify_report permission
    if not check_user_permission(current_user, "verify_report", project.id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to generate reports in this project"
        )
    
    # Determine version number
    if request.auto_version:
        # Get latest version and increment
        latest_version = db.query(DocumentVersion)\
            .filter(DocumentVersion.project_id == project_id)\
            .order_by(DocumentVersion.created_at.desc())\
            .first()
        
        if latest_version:
            # Parse version and increment (e.g., "1.0" -> "1.1", "1.9" -> "2.0")
            try:
                major, minor = latest_version.version.split('.')
                minor = int(minor) + 1
                if minor >= 10:
                    major = int(major) + 1
                    minor = 0
                version_number = f"{major}.{minor}"
            except:
                version_number = "1.1"
        else:
            version_number = "1.0"
    else:
        version_number = request.version or "1.0"
    
    # Determine report number
    report_number = request.report_number or f"RMR-{datetime.now().year}-{project_id:02d}"
    
    # Gather project data
    project_data = {
        'id': project.id,
        'device_name': project.device_name,
        'device_model': project.device_model,
        'device_classification': project.device_classification,
        'intended_use': project.intended_use,
        'user_profile': project.user_profile,
        'operating_environment': project.operating_environment,
        'standards': project.standards,
        'lifecycle_stages': project.lifecycle_stages,
        'active_hazard_categories': project.active_hazard_categories,
        'version': version_number,
        'report_number': report_number,
        # Manufacturer information
        'manufacturer': project.manufacturer,
        'manufacturer_address': project.manufacturer_address,
        # Additional device characteristics
        'patient_population': project.patient_population,
        'key_performance_characteristics': project.key_performance_characteristics,
        'safety_characteristics': project.safety_characteristics,
        # Risk configuration
        'severity_levels': project.severity_levels,
        'probability_levels': project.probability_levels,
        'risk_threshold': project.risk_threshold,
        # Checklist answers
        'hazard_checklist_answers': project.hazard_checklist_answers,
    }
    
    # Gather risk data from all tables
    risk_tables = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id
    ).all()
    
    all_risks = []
    for table in risk_tables:
        rows = db.query(RiskTableRow).filter(
            RiskTableRow.table_id == table.id
        ).order_by(RiskTableRow.row_index).all()
        
        for row in rows:
            # Ensure row.data is a dict, fallback to empty dict if None
            row_data = row.data if isinstance(row.data, dict) else {}
            all_risks.append({
                'id': row.id,
                'row_number': row.row_number,
                'data': row_data,
                'table_name': table.name or table.sheet_id
            })
    
    # Gather team members
    team_members = []
    try:
        members = db.query(ProjectMember, User).join(
            User, ProjectMember.user_id == User.id
        ).filter(ProjectMember.project_id == project_id).all()

        for member, user in members:
            if user:  # Ensure user exists
                team_members.append({
                    'name': f"{user.first_name or ''} {user.last_name or ''}".strip(),
                    'email': user.email or '',
                    'role': getattr(member.role, 'value', str(member.role)) if member.role else ''
                })

        # Add project owner if not in members
        owner = db.query(User).filter(User.id == project.owner_id).first()
        if owner and not any(m.get('email') == owner.email for m in team_members):
            team_members.append({
                'name': f"{owner.first_name or ''} {owner.last_name or ''}".strip(),
                'email': owner.email or '',
                'role': 'admin'
            })
    except Exception as e:
        print(f"DEBUG: Error gathering team members: {e}")
        team_members = []  # Fallback to empty list
    
    # Create table data structure
    table_data = {
        'tables': []
    }
    for table in risk_tables:
        table_data['tables'].append({
            'name': table.name or table.sheet_id,
            'sheet_id': table.sheet_id
        })
    
    # Generate document
    try:
        # Log data for debugging
        print(f"DEBUG: Generating document for project {project_id}")
        print(f"DEBUG: Project data keys: {list(project_data.keys()) if project_data else 'None'}")
        print(f"DEBUG: Risk count: {len(all_risks) if all_risks else 0}")
        print(f"DEBUG: Team members count: {len(team_members) if team_members else 0}")
        print(f"DEBUG: Format: {format}")

        if format.lower() == "pdf":
            print("DEBUG: Using PDF generator")
            from ..services.document_generator import PDFRiskManagementReportGenerator
            generator = PDFRiskManagementReportGenerator(
                project_data=project_data,
                risk_data=all_risks,
                table_data=table_data,
                team_members=team_members
            )
        else:
            print("DEBUG: Using DOCX generator")
            # Default to DOCX
            generator = RiskManagementReportGenerator(
                project_data=project_data,
                risk_data=all_risks,
                table_data=table_data,
                team_members=team_members
            )

        print("DEBUG: Calling generator.generate()")
        file_stream = generator.generate()
        print("DEBUG: Generator completed, reading file data")
        file_data = file_stream.read()
        print(f"DEBUG: File data size: {len(file_data)} bytes")
        
        # Create snapshot of data
        snapshot = {
            'project': project_data,
            'risks_count': len(all_risks),
            'team_count': len(team_members),
            'generated_at': datetime.now().isoformat()
        }
        
        # Mark all previous versions as not current
        db.query(DocumentVersion).filter(
            DocumentVersion.project_id == project_id,
            DocumentVersion.is_current == True
        ).update({'is_current': False})
        
        # Create new document version record
        extension = "pdf" if format.lower() == "pdf" else "docx"
        file_name = f"Risk_Management_Report_{project.device_name}_{version_number}.{extension}".replace(' ', '_')
        
        new_version = DocumentVersion(
            project_id=project_id,
            version=version_number,
            report_number=report_number,
            title=f"Risk Management Report - {project.device_name}",
            document_type="risk_management_report",
            file_data=file_data,
            file_name=file_name,
            file_size=len(file_data),
            snapshot_data=json.dumps(snapshot),
            generated_by=current_user.id,
            is_current=True
        )
        
        db.add(new_version)
        db.commit()
        db.refresh(new_version)
        
        # Prepare response
        response_data = DocumentVersionResponse(
            id=new_version.id,
            project_id=new_version.project_id,
            version=new_version.version,
            report_number=new_version.report_number,
            title=new_version.title,
            document_type=new_version.document_type,
            file_name=new_version.file_name,
            file_size=new_version.file_size,
            generated_by=new_version.generated_by,
            generated_at=new_version.generated_at,
            is_current=new_version.is_current,
            created_at=new_version.created_at,
            generator_name=f"{current_user.first_name} {current_user.last_name}",
            generator_email=current_user.email
        )
        
        return response_data
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate document: {str(e)}")


@router.get("/projects/{project_id}/versions", response_model=List[DocumentVersionList])
async def get_document_versions(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all document versions for a project
    """
    # Check if project exists and user has access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check user access
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied to this project")
    
    # Get all versions
    versions = db.query(DocumentVersion, User).join(
        User, DocumentVersion.generated_by == User.id
    ).filter(
        DocumentVersion.project_id == project_id
    ).order_by(DocumentVersion.created_at.desc()).all()
    
    result = []
    for doc_version, generator in versions:
        result.append(DocumentVersionList(
            id=doc_version.id,
            version=doc_version.version,
            report_number=doc_version.report_number,
            file_name=doc_version.file_name,
            file_size=doc_version.file_size,
            generated_at=doc_version.generated_at,
            is_current=doc_version.is_current,
            generator_name=f"{generator.first_name} {generator.last_name}"
        ))
    
    return result


@router.get("/projects/{project_id}/versions/{version_id}")
async def get_document_version_details(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get details of a specific document version
    """
    # Check access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get version
    doc_version = db.query(DocumentVersion, User).join(
        User, DocumentVersion.generated_by == User.id
    ).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.project_id == project_id
    ).first()
    
    if not doc_version:
        raise HTTPException(status_code=404, detail="Document version not found")
    
    version, generator = doc_version
    
    return DocumentVersionResponse(
        id=version.id,
        project_id=version.project_id,
        version=version.version,
        report_number=version.report_number,
        title=version.title,
        document_type=version.document_type,
        file_name=version.file_name,
        file_size=version.file_size,
        generated_by=version.generated_by,
        generated_at=version.generated_at,
        is_current=version.is_current,
        created_at=version.created_at,
        generator_name=f"{generator.first_name} {generator.last_name}",
        generator_email=generator.email
    )


@router.options("/projects/{project_id}/versions/{version_id}/download")
async def download_document_options():
    """Handle CORS preflight for download endpoint"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Access-Control-Max-Age": "3600"
        }
    )


@router.get("/projects/{project_id}/versions/{version_id}/download")
async def download_document(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a specific document version as DOCX file
    """
    # Check access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")

    # Check verify_report permission
    if not check_user_permission(current_user, "verify_report", project.id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to download reports in this project"
        )

    # Get document version
    doc_version = db.query(DocumentVersion).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.project_id == project_id
    ).first()
    
    if not doc_version:
        raise HTTPException(status_code=404, detail="Document version not found")
    
    if not doc_version.file_data:
        raise HTTPException(status_code=404, detail="Document file not found")
    
    # Create a safe ASCII filename for headers
    try:
        import unicodedata
        import re

        # Convert to ASCII-safe filename by transliterating non-ASCII chars
        safe_filename = unicodedata.normalize('NFKD', doc_version.file_name)
        safe_filename = ''.join(c for c in safe_filename if ord(c) < 128)  # Keep only ASCII chars
        safe_filename = re.sub(r'[^\w\-_\. ]', '_', safe_filename)  # Replace remaining non-alphanumeric chars with underscores
        safe_filename = re.sub(r'_+', '_', safe_filename)  # Replace multiple underscores with single

        if not safe_filename or len(safe_filename) < 5:
            safe_filename = f"document_{doc_version.id}.docx"
    except Exception as e:
        # Fallback to simple ASCII filename if encoding fails
        print(f"DEBUG: Filename encoding failed: {e}, using fallback")
        safe_filename = f"document_{doc_version.id}.docx"

    # Return file directly with proper headers
    return Response(
        content=doc_version.file_data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type"
        }
    )


@router.get("/projects/{project_id}/versions/{version_id}/preview")
async def preview_document(
    project_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Preview document as HTML
    """
    # Check access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get document version
    doc_version = db.query(DocumentVersion).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.project_id == project_id
    ).first()
    
    if not doc_version:
        # Check if version exists at all
        version_exists = db.query(DocumentVersion).filter(
            DocumentVersion.id == version_id
        ).first()
        if version_exists:
            raise HTTPException(
                status_code=404, 
                detail=f"Document version {version_id} exists but belongs to a different project"
            )
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Document version {version_id} not found for project {project_id}"
            )
    
    # Get project data for HTML preview
    risk_tables = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id
    ).all()

    all_risks = []
    for table in risk_tables:
        rows = db.query(RiskTableRow).filter(
            RiskTableRow.table_id == table.id
        ).order_by(RiskTableRow.row_index).all()
        for row in rows:
            # Ensure row.data is a dict, fallback to empty dict if None
            row_data = row.data if isinstance(row.data, dict) else {}
            # Add table_name for HTML preview consistency
            row_data['table_name'] = table.name or table.sheet_id
            all_risks.append(row_data)
    
    # Get team members
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id
    ).all()
    team_members = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            team_members.append({
                'name': f"{user.first_name} {user.last_name}",
                'role': member.role.value if hasattr(member.role, 'value') else str(member.role),
                'email': user.email
            })
    
    # Generate HTML preview
    print(f"DEBUG: Generating preview for project {project_id}, version {version_id}")
    print(f"DEBUG: Project device_name: {project.device_name}")
    print(f"DEBUG: Risks count: {len(all_risks)}")
    print(f"DEBUG: Team members count: {len(team_members)}")
    
    html_content = generate_html_preview(project, doc_version, all_risks, team_members)
    
    print(f"DEBUG: Generated HTML length: {len(html_content)} characters")
    
    # Return HTML with CORS headers
    return HTMLResponse(
        content=html_content,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )


def generate_html_preview(project, doc_version, risks, team_members):
    """Generate complete HTML preview of the document"""
    import html
    
    def escape_html(text):
        if text is None:
            return '<span class="empty-field">не заполнено</span>'
        return html.escape(str(text))
    
    def get_field(value, default='не заполнено'):
        if not value or str(value).strip() == '':
            return f'<span class="empty-field">{default}</span>'
        return escape_html(value)
    
    # Safely parse lifecycle_stages
    try:
        if project.lifecycle_stages:
            if isinstance(project.lifecycle_stages, str):
                parsed = json.loads(project.lifecycle_stages)
            else:
                parsed = project.lifecycle_stages
            
            # Convert to list of strings
            if isinstance(parsed, list):
                lifecycle_stages = [str(item) for item in parsed if item]
            elif isinstance(parsed, dict):
                lifecycle_stages = [str(v) for v in parsed.values() if v] if parsed else []
            else:
                lifecycle_stages = []
        else:
            lifecycle_stages = []
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"DEBUG: Error parsing lifecycle_stages: {e}")
        lifecycle_stages = []
    
    # Safely parse hazard_categories
    try:
        if project.active_hazard_categories:
            if isinstance(project.active_hazard_categories, str):
                parsed = json.loads(project.active_hazard_categories)
            else:
                parsed = project.active_hazard_categories
            
            # Convert to list of strings
            if isinstance(parsed, list):
                hazard_categories = [str(item) for item in parsed if item]
            elif isinstance(parsed, dict):
                hazard_categories = [str(v) for v in parsed.values() if v] if parsed else []
            else:
                hazard_categories = []
        else:
            hazard_categories = []
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"DEBUG: Error parsing hazard_categories: {e}")
        hazard_categories = []
    
    date_str = doc_version.created_at.strftime('%d %B %Y') if doc_version.created_at else '<span class="empty-field">не заполнено</span>'
    
    # Calculate risk statistics
    acceptable_risks = 0
    unacceptable_risks = 0
    if risks:
        for risk in risks:
            s_res = risk.get('severity_residual', 0) or 0
            p_res = risk.get('probability_residual', 0) or 0
            risk_value = s_res * p_res
            if risk_value and risk_value >= 10:
                unacceptable_risks += 1
            elif risk_value and risk_value < 10:
                acceptable_risks += 1
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Risk Management Report - {escape_html(project.device_name or 'N/A')}</title>
        <style>
            body {{ font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; background: #fff; }}
            h1 {{ color: #1f2937; border-bottom: 2px solid #6366f1; padding-bottom: 10px; text-align: center; }}
            h2 {{ color: #374151; margin-top: 40px; margin-bottom: 20px; font-size: 1.5em; }}
            h3 {{ color: #4b5563; margin-top: 25px; margin-bottom: 15px; font-size: 1.2em; }}
            p {{ margin: 10px 0; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; page-break-inside: avoid; }}
            th, td {{ border: 1px solid #d1d5db; padding: 10px; text-align: left; vertical-align: top; }}
            th {{ background-color: #f3f4f6; font-weight: bold; }}
            .empty-field {{ color: #9ca3af; font-style: italic; }}
            .section {{ margin-bottom: 50px; page-break-inside: avoid; }}
            .info-table {{ width: 100%; }}
            .info-table td:first-child {{ font-weight: bold; width: 200px; }}
            ul {{ margin: 10px 0; padding-left: 30px; }}
            li {{ margin: 5px 0; }}
        </style>
    </head>
    <body>
        <h1>RISK MANAGEMENT REPORT</h1>
        
        <!-- 1. ТИТУЛЬНЫЙ ЛИСТ -->
        <div class="section">
            <h2>1. ТИТУЛЬНЫЙ ЛИСТ</h2>
            <p><strong>Medical device:</strong> {get_field(project.device_name)}</p>
            <p><strong>Report No.:</strong> {get_field(doc_version.report_number)}</p>
            <p><strong>Revision:</strong> {get_field(doc_version.version)}</p>
            <p><strong>Date:</strong> {date_str}</p>
        </div>
        
        <!-- 2. СОДЕРЖАНИЕ -->
        <div class="section">
            <h2>2. СОДЕРЖАНИЕ</h2>
            <p>Все разделы ниже</p>
        </div>
        
        <!-- 3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ -->
        <div class="section">
            <h2>3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ</h2>
            <table class="info-table">
                <tr><td>Device name</td><td>{get_field(project.device_name)}</td></tr>
                <tr><td>Model / Type</td><td>{get_field(project.device_model)}</td></tr>
                <tr><td>Category risk</td><td>{get_field(project.device_classification)}</td></tr>
                <tr><td>Operating environment</td><td>{get_field(project.operating_environment)}</td></tr>
                <tr><td>Standards and regulations applied</td><td>{get_field(project.standards)}</td></tr>
                <tr><td>Этапы жизненного цикла</td><td>{', '.join([escape_html(s) for s in lifecycle_stages]) if lifecycle_stages else '<span class="empty-field">не заполнено</span>'}</td></tr>
                <tr><td>Идентифицированные категории опасностей</td><td>{', '.join([escape_html(c) for c in hazard_categories]) if hazard_categories else '<span class="empty-field">не заполнено</span>'}</td></tr>
            </table>
        </div>
        
        <!-- 4. Identification of Hazards -->
        <div class="section">
            <h2>4. Identification of Hazards (Идентификация опасностей)</h2>
            <h3>4.1 Цель раздела</h3>
            <p>Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.</p>
            
            
            
            <h3>4.2 Таблица идентифицированных опасностей</h3>
            {generate_risks_table(risks, ['table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm']) if risks else '<p class="empty-field">Таблица опасностей не заполнена</p>'}
            
            <h3>4.3 Резюме раздела</h3>
            <p>Идентифицированы основные опасности, связанные с {', '.join([escape_html(c) for c in hazard_categories]) if hazard_categories else '<span class="empty-field">не заполнено</span>'}</p>
            <p>Для каждой опасности будет проведён анализ риска (раздел 5) с оценкой тяжести и вероятности, а также определены меры контроля (раздел 6).</p>
        </div>
        
        <!-- 5. Risk Analysis -->
        <div class="section">
            <h2>5. Risk Analysis (Before Risk Control)</h2>
            <h3>5.1 Методология оценки</h3>
            <p>Для анализа рисков используется качественно-количественная методика </p>
            <p><strong>Риск = вероятность × тяжесть</strong></p>
            
            <p><strong>Severity (S) — Тяжесть вреда:</strong></p>
            {generate_severity_table(project)}
            <p><strong>Probability (P) — Вероятность возникновения:</strong></p>
            {generate_probability_table(project)}

            <h4>Уровень риска (доп./не доп.):</h4>
            <p>Укажите пороговое значение уровня риска. Если произведение "Тяжесть вреда" × "Вероятность" будет больше или равно этому значению, риск будет считаться недопустимым. Если меньше - допустимым.</p>
            <p><strong>Пороговое значение уровня риска: {getattr(project, 'risk_threshold', 10) if hasattr(project, 'risk_threshold') else 10}</strong></p>
            <p>от 1 до 20</p>
            <p>ℹ️ Пояснение: Вы можете установить любое пороговое значение риска по вашему усмотрению. Значение по умолчанию - 10. Риск считается недопустимым, если его уровень превышает или равен указанному порогу.</p>
            <p>Пример допустимого риска:</p>
            <p>Тяжесть: 2 × Вероятность: 1 = Риск: 2 ✓ допустимый</p>
            <p>Пример недопустимого риска:</p>
            <p>Тяжесть: 5 × Вероятность: 5 = Риск: 25 ✗ недопустимый (при пороге {getattr(project, 'risk_threshold', 10)})</p>


            
            
        
        <!-- 6. Risk Control Measures -->
        <div class="section">
            <h2>6. Risk Control Measures (Меры управления рисками)</h2>
            <h3>6.1 Цель раздела</h3>
            <p>Определить и задокументировать меры, применённые для снижения или устранения рисков, связанных с выявленными опасными ситуациями.</p>
            
            <h3>6.2 Таблица мер управления рисками</h3>
            {generate_risks_table(risks, ['lifecycle_stage', 'hazard', 'control_measures']) if risks else '<p class="empty-field">Таблица мер управления рисками не заполнена</p>'}
        </div>
        
        <!-- 7. Residual Risk Evaluation -->
        <div class="section">
            <h2>7. Residual Risk Evaluation</h2>
            <h3>7.1 Цель раздела</h3>
            <p>Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми в соответствии с установленными критериями риск-аппетита организации и принципом ALARP</p>
            
            <h3>7.2 Таблица оценки остаточных рисков</h3>
            {generate_residual_risks_table(risks) if risks else '<p class="empty-field">Таблица остаточных рисков не заполнена</p>'}
            
            
        
        <!-- 8. Overall Residual Risk Acceptability -->
        <div class="section">
            <h2>8. Overall Residual Risk Acceptability (Оценка совокупного остаточного риска)</h2>
            <h3>8.1 Цель раздела</h3>
            <p>Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение польза/риск (Benefit-Risk balance), как требует ISO 14971:2019, п. 8.3.</p>
            
            
        </div>
        
        <!-- 9. Conclusions -->
        <div class="section">
            <h2>9.1 Общие выводы</h2>
            <p>На основании проведённого процесса идентификации опасностей, анализа, оценки и управления рисками, подтверждено, что:</p>
            <ul>
                <li>Все идентифицированные риски были рассмотрены и оценены в соответствии с требованиями ISO 14971:2019;</li>
                <li>Идентифицировано рисков – {len(risks) if risks else '<span class="empty-field">?</span>'} из них приемлемых - {acceptable_risks if acceptable_risks > 0 else '<span class="empty-field">?</span>'} неприемлемых - {unacceptable_risks if unacceptable_risks > 0 else '<span class="empty-field">?</span>'}</li>
                <li>Все меры контроля риска внедрены, проверены и признаны эффективными;</li>
                <li>Все остаточные риски находятся на приемлемом уровне или в зоне ALARP;</li>
                <li>Совокупный остаточный риск признан приемлемым в контексте назначения изделия и ожидаемой пользы;</li>
                <li>Документация по управлению рисками является полной, прослеживаемой и согласована с системой менеджмента качества, соответствующей ISO 13485:2016;</li>
                <li>Постпроизводственная информация (PMS, жалобы, CAPA) будет регулярно анализироваться для пересмотра оценки рисков.</li>
            </ul>
            
            <h3>9.2 Заключение</h3>
            <p><strong>Заключение:</strong></p>
            <p>На момент утверждения данного отчёта совокупный остаточный риск изделия {get_field(project.device_name)} считается приемлемым.</p>
            <p>Процесс управления рисками реализован в полном соответствии с ISO 14971:2019.</p>
            
            <h3>9.3 Состав команды по менеджменту рисков, согласовывание и утверждения отчета</h3>
            {generate_team_table(team_members, date_str) if team_members else '<p class="empty-field">Команда проекта не заполнена</p>'}
        </div>
        
        <!-- 10. References -->
        <div class="section">
            <h2>10. References and Document Control</h2>
            <h3>10.1 Ссылки и нормативные документы</h3>
            <table>
                <tr><th>№</th><th>Документ / Стандарт</th><th>Наименование</th></tr>
                <tr><td>1</td><td>ISO 14971:2019</td><td>Medical devices — Application of risk management to medical devices</td></tr>
                <tr><td>2</td><td>ISO 13485:2016</td><td>Quality management systems — Requirements for regulatory purposes</td></tr>
                <tr><td>3</td><td>MDR 2017/745</td><td>Regulation (EU) 2017/745 on medical devices</td></tr>
                <tr><td>4</td><td>ISO 10993-1:2020</td><td>Biological evaluation of medical devices — Part 1</td></tr>
                <tr><td>5</td><td>ISO 17664:2017</td><td>Processing of health care products — Information to be provided by the manufacturer for the processing of resterilizable medical devices</td></tr>
                <tr><td>6</td><td>Company SOP QMS-RM-001</td><td>Risk Management Procedure</td></tr>
                <tr><td>7</td><td>IFU-CP-01</td><td>Instructions for Use — Cleaning Container</td></tr>
            </table>
            
            <h3>10.2 Управление документом</h3>
            <table class="info-table">
                <tr><td>Document title</td><td>Risk Management Report — {get_field(project.device_name)}</td></tr>
                <tr><td>Document number</td><td>{get_field(doc_version.report_number)}</td></tr>
                <tr><td>Revision</td><td>{get_field(doc_version.version)}</td></tr>
                <tr><td>Status</td><td>Approved</td></tr>
                <tr><td>Effective date</td><td>{date_str.replace(' ', '.') if isinstance(date_str, str) and 'не заполнено' not in date_str else date_str}</td></tr>
                <tr><td>Controlled copy location</td><td>QMS Repository / Folder: "Risk Management"</td></tr>
            </table>
        </div>
        

    </body>
    </html>
    """
    return html


def generate_risks_table(risks, columns):
    """Generate HTML table for risks with exact Excel structure"""
    import html as html_module

    if not risks:
        return '<p class="empty-field">Нет данных</p>'

    # For summary tables (4.2, 6.2, 7.2) - show exact Excel structure
    if len(columns) <= 5:
        if columns == ['table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm']:
            # Table 4.2 - Show all Excel fields including Категория опасности and Последовательность событий
            all_columns = ['table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm']
            col_names = {
                'table_name': 'Этап жизненного цикла',
                'hazard_category': 'Категория опасности',
                'hazard_name': 'Наименование опасности',
                'event_sequence': 'Последовательность событий',
                'harm': 'Вред'
            }
        elif columns == ['table_name', 'hazard', 'hazardous_situation', 'harm']:
            # Legacy Table 4.2 - fallback
            all_columns = ['table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm']
            col_names = {
                'table_name': 'Этап жизненного цикла',
                'hazard_category': 'Категория опасности',
                'hazard_name': 'Наименование опасности',
                'event_sequence': 'Последовательность событий',
                'harm': 'Вред'
            }
        elif columns == ['lifecycle_stage', 'hazard', 'control_measures']:
            # Table 6.2 - Control measures with ALL fields (remove Категория опасности and Последовательность событий, remove prefix)
            all_columns = [
                'table_name', 'hazard_name', 'hazardous_situation', 'harm',
                'severity_score', 'probability_score', 'risk_score', 'risk_level_1',
                'control_measure_1', 'control_measure_2', 'control_measure_3',
                'verification_1', 'verification_2', 'verification_3',
                'residual_risk_level', 'residual_probability', 'residual_risk_score', 'risk_level_2',
                'comment_1', 'comment_2', 'inherent_safety', 'protective_measure'
            ]
            col_names = {
                'table_name': 'Этап жизненного цикла',
                'hazard_name': 'Наименование опасности',  # Skip category
                'hazardous_situation': 'Опасная ситуация',
                'harm': 'Вред',
                'severity_score': 'Тяжесть вреда, балл',
                'probability_score': 'Вероятность причинения вреда, балл',
                'risk_score': 'Риск, балл',
                'risk_level_1': 'Уровень риска (доп./не доп.)',
                'control_measure_1': 'Меры по управлению риском (1)',
                'control_measure_2': 'Меры по управлению риском (2)',
                'control_measure_3': 'Меры по управлению риском (3)',
                'verification_1': 'Верификация мер по управлению риском (1)',
                'verification_2': 'Верификация мер по управлению риском (2)',
                'verification_3': 'Верификация мер по управлению риском (3)',
                'residual_risk_level': 'Тяжесть вреда, балл (остат.)',
                'residual_probability': 'Вероятность причинения вреда, балл (остат.)',
                'residual_risk_score': 'Достигнутый риск и его уровень',
                'risk_level_2': 'Уровень риска (доп./не доп.) (остат.)',
                'comment_1': 'Комментарий',
                'comment_2': 'Комментарий (остат.)',
                'inherent_safety': 'Безопасность, заложенная в конструкции',
                'protective_measure': 'Защитная мера/средство'
            }
        else:
            # Default case
            all_columns = columns
            col_names = {
                'table_name': 'Этап жизненного цикла',
                'hazard': 'Категория опасности',
                'hazardous_situation': 'Наименование опасности',
                'sequence_of_events': 'Последовательность событий',
                'harm': 'Вред'
            }
    else:
        # Full detailed view
        all_columns = columns
        col_names = {
            'table_name': 'Этап жизненного цикла',
            'hazard': 'Категория опасности',
            'hazardous_situation': 'Наименование опасности',
            'sequence_of_events': 'Последовательность событий',
            'harm': 'Вред',
            'severity_initial': 'Тяжесть вреда, балл',
            'probability_initial': 'Вероятность причинения вреда, балл',
            'risk_score': 'Риск, балл',
            'risk_level_1': 'Уровень риска (доп./не доп.)',
            'control_measure_1': 'Меры по управлению риском (1)',
            'control_measure_2': 'Меры по управлению риском (2)',
            'control_measure_3': 'Меры по управлению риском (3)',
            'verification_1': 'Верификация мер по управлению риском (1)',
            'verification_2': 'Верификация мер по управлению риском (2)',
            'verification_3': 'Верификация мер по управлению риском (3)',
            'severity_residual': 'Тяжесть вреда, балл (остат.)',
            'probability_residual': 'Вероятность причинения вреда, балл (остат.)',
            'residual_risk_score': 'Достигнутый риск и его уровень',
            'risk_level_2': 'Уровень риска (доп./не доп.) (остат.)',
            'comment_1': 'Комментарий',
            'comment_2': 'Комментарий (остат.)',
            'risk_benefit_analysis': 'Анализ остаточный риск/польза',
            'new_risks': 'Новые риски в результате принятия мер по управлению',
            'inherent_safety': 'Безопасность, заложенная в конструкции',
            'protective_measure': 'Защитная мера/средство',
            'safety_information': 'Информация по безопасности/обучению'
        }

    html = '<table><thead><tr>'
    for col in all_columns:
        col_name = col_names.get(col, col.replace('_', ' ').title())
        html += f'<th>{col_name}</th>'
    html += '</tr></thead><tbody>'

    for risk in risks:
        html += '<tr>'
        for col in all_columns:
            value = risk.get(col, '')
            if not value or str(value).strip() == '':
                value = '<span class="empty-field">не заполнено</span>'
            else:
                # Remove "Управление рисками -" prefix if present
                if col == 'table_name' and isinstance(value, str) and value.startswith('Управление рисками - '):
                    value = value.replace('Управление рисками - ', '', 1)
                value = html_module.escape(str(value))
            html += f'<td>{value}</td>'
        html += '</tr>'

    html += '</tbody></table>'
    return html


def generate_residual_risks_table(risks):
    """Generate HTML table for residual risks with ALL Excel fields including Категория опасности and Последовательность событий"""
    import html as html_module

    if not risks:
        return '<p class="empty-field">Нет данных</p>'

    # Show comprehensive table with ALL Excel columns for residual risk evaluation
    all_columns = [
        'table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm',
        'residual_risk_level', 'residual_probability', 'residual_risk_score', 'risk_level_2',
        'comment_2', 'risk_benefit_analysis', 'new_risks'
    ]

    # Column name mapping
    col_names = {
        'table_name': 'Этап жизненного цикла',
        'hazard_category': 'Категория опасности',
        'hazard_name': 'Наименование опасности',
        'event_sequence': 'Последовательность событий',
        'harm': 'Вред',
        'residual_risk_level': 'Тяжесть вреда, балл (остат.)',
        'residual_probability': 'Вероятность причинения вреда, балл (остат.)',
        'residual_risk_score': 'Достигнутый риск и его уровень',
        'risk_level_2': 'Уровень риска (доп./не доп.) (остат.)',
        'comment_2': 'Комментарий (остат.)',
        'risk_benefit_analysis': 'Анализ остаточный риск/польза',
        'new_risks': 'Новые риски в результате принятия мер по управлению'
    }

    html = '<table><thead><tr>'
    for col in all_columns:
        col_name = col_names.get(col, col.replace('_', ' ').title())
        html += f'<th>{col_name}</th>'
    html += '</tr></thead><tbody>'

    for risk in risks:
        html += '<tr>'
        for col in all_columns:
            value = risk.get(col, '')
            if not value or str(value).strip() == '':
                value = '<span class="empty-field">не заполнено</span>'
            else:
                # Remove "Управление рисками -" prefix if present
                if col == 'table_name' and isinstance(value, str) and value.startswith('Управление рисками - '):
                    value = value.replace('Управление рисками - ', '', 1)
                value = html_module.escape(str(value))
            html += f'<td>{value}</td>'
        html += '</tr>'

    html += '</tbody></table>'
    return html


def format_role_display_name(role: str) -> str:
    """
    Convert role code to display name in uppercase format
    Used in documents to display roles consistently
    """
    role_mapping = {
        'admin': 'ADMIN',
        'manager': 'MANAGER',
        'doctor': 'DOCTOR',
        'product_manager': 'PRODUCT MANAGER',
        'risk_assessment_team_leader': 'RISK ASSESSMENT TEAM LEADER',
        'quality_management_representative': 'QUALITY MANAGMENT REPRESENTATIVE',
        'risk_assessment_team_member': 'RISK ASSESSMENT TEAM MEMBER'
    }
    return role_mapping.get(role, role.upper() if role else 'UNKNOWN')


def generate_team_table(team_members, date_str):
    """Generate team members table"""
    import html as html_module
    
    html = '<table><thead><tr><th>Имя</th><th>Должность</th><th>Роль</th><th>Подпись</th><th>Дата</th></tr></thead><tbody>'
    
    for member in team_members:
        name = html_module.escape(member.get('name', ''))
        role = format_role_display_name(member.get('role', ''))
        role_escaped = html_module.escape(role)
        html += f'<tr>'
        html += f'<td>{name}</td>'
        html += f'<td><span class="empty-field">не заполнено</span></td>'
        html += f'<td>{role_escaped}</td>'
        html += f'<td></td>'
        html += f'<td>{date_str.replace(" ", ".") if isinstance(date_str, str) and "не заполнено" not in date_str else date_str}</td>'
        html += '</tr>'
    
    html += '</tbody></table>'
    return html





def generate_severity_table(project):
    """Generate severity levels table from project configuration"""
    import html as html_module

    # Parse severity levels from project
    try:
        if project.severity_levels:
            if isinstance(project.severity_levels, str):
                severity_levels = json.loads(project.severity_levels)
            else:
                severity_levels = project.severity_levels
        else:
            severity_levels = []
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"DEBUG: Error parsing severity_levels: {e}")
        severity_levels = []

    if not severity_levels:
        # Fallback to default severity levels
        return '''<table>
            <tr><th>Уровень</th><th>Описание</th><th>Пример</th></tr>
            <tr><td>1</td><td>Незначительный</td><td>Лёгкое раздражение кожи</td></tr>
            <tr><td>2</td><td>Малый</td><td>Обратимая травма, лёгкий порез</td></tr>
            <tr><td>3</td><td>Средний</td><td>Временная потеря трудоспособности</td></tr>
            <tr><td>4</td><td>Серьёзный</td><td>Значительная травма, госпитализация</td></tr>
            <tr><td>5</td><td>Критический</td><td>Смерть или необратимое повреждение органа</td></tr>
        </table>'''

    # Generate table from project configuration
    html = '<table><thead><tr><th>Уровень</th><th>Название</th><th>Описание</th><th>Балл</th></tr></thead><tbody>'

    for level_data in severity_levels:
        level = level_data.get('level', '')
        name = html_module.escape(str(level_data.get('name', '')))
        description = html_module.escape(str(level_data.get('description', '')))
        score = level_data.get('score', level_data.get('level', ''))

        html += f'<tr><td>{level}</td><td>{name}</td><td>{description}</td><td>{score}</td></tr>'

    html += '</tbody></table>'
    return html


def generate_probability_table(project):
    """Generate probability levels table from project configuration"""
    import html as html_module

    # Parse probability levels from project
    try:
        if project.probability_levels:
            if isinstance(project.probability_levels, str):
                probability_levels = json.loads(project.probability_levels)
            else:
                probability_levels = project.probability_levels
        else:
            probability_levels = []
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"DEBUG: Error parsing probability_levels: {e}")
        probability_levels = []

    if not probability_levels:
        # Fallback to default probability levels
        return '''<table>
            <tr><th>Уровень</th><th>Описание</th><th>Пример</th></tr>
            <tr><td>1</td><td>Очень редкое</td><td>Почти невозможно (<1/10000)</td></tr>
            <tr><td>2</td><td>Редкое</td><td>Возможное при особых обстоятельствах</td></tr>
            <tr><td>3</td><td>Иногда</td><td>Может произойти время от времени</td></tr>
            <tr><td>4</td><td>Вероятное</td><td>Может происходить регулярно</td></tr>
            <tr><td>5</td><td>Частое</td><td>Происходит регулярно</td></tr>
        </table>'''

    # Generate table from project configuration
    html = '<table><thead><tr><th>Уровень</th><th>Название</th><th>Описание</th></tr></thead><tbody>'

    for level_data in probability_levels:
        level = level_data.get('level', '')
        name = html_module.escape(str(level_data.get('name', '')))
        description = html_module.escape(str(level_data.get('description', '')))

        html += f'<tr><td>{level}</td><td>{name}</td><td>{description}</td></tr>'

    html += '</tbody></table>'
    return html


@router.get("/projects/{project_id}/current")
async def get_current_document(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the current/latest document version for a project
    """
    # Check access
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get current version
    doc_version = db.query(DocumentVersion, User).join(
        User, DocumentVersion.generated_by == User.id
    ).filter(
        DocumentVersion.project_id == project_id,
        DocumentVersion.is_current == True
    ).first()
    
    if not doc_version:
        # No document generated yet
        return None
    
    version, generator = doc_version
    
    return DocumentVersionResponse(
        id=version.id,
        project_id=version.project_id,
        version=version.version,
        report_number=version.report_number,
        title=version.title,
        document_type=version.document_type,
        file_name=version.file_name,
        file_size=version.file_size,
        generated_by=version.generated_by,
        generated_at=version.generated_at,
        is_current=version.is_current,
        created_at=version.created_at,
        generator_name=f"{generator.first_name} {generator.last_name}",
        generator_email=generator.email
    )
