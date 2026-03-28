"""
Document generation and management router
"""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List
from types import SimpleNamespace
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
from ..services.document_generator import (
    RiskManagementReportGenerator,
    _prepare_html_for_xhtml2pdf,
    _pisa_link_callback,
)


router = APIRouter(prefix="/api/documents", tags=["documents"])


LIFECYCLE_STAGE_LABELS = {
    'design_development': 'Проектирование и разработка',
    'procurement': 'Закупка и входной контроль компонентов и материалов',
    'production': 'Производство и сборка',
    'packaging': 'Упаковка и маркировка',
    'installation': 'Монтаж',
    'sterilization': 'Стерилизация',
    'testing': 'Испытания и выпуск продукции',
    'storage': 'Хранение',
    'transportation': 'Транспортировка и дистрибуция',
    'commissioning': 'Установка и ввод в эксплуатацию',
    'operation': 'Эксплуатация',
    'maintenance': 'Техническое обслуживание и сервис',
    'decommissioning': 'Демонтаж и вывод из эксплуатации',
    'disposal': 'Утилизация и уничтожение изделия или его компонентов',
    'other': 'Другие'
}

HAZARD_CHECKLIST_STRUCTURE = [
    ('Основные свойства устройства', [
        ('active', 'Активное', 'Опасности, связанные с электричеством'),
        ('sterile', 'Стерильное', 'Опасности, связанные с микробиологическими факторами'),
        ('disposable', 'Одноразовое', 'Опасности, связанные с микробиологическими факторами'),
        ('containsSoftware', 'Программное обеспечение входит в состав?', 'Опасности, связанные с безопасностью данных и систем'),
        ('implantable', 'Предназначено для имплантации?', 'Опасности, связанные с биосовместимостью'),
    ]),
    ('Биосовместимость', [
        ('bodyContact', 'Имеет ли изделие контакт с телом человека или его жидкостями?', 'Опасности, связанные с биосовместимостью'),
        ('materialContact', 'Используются ли материалы с прямым контактом с тканями или жидкостями?', 'Опасности, связанные с биосовместимостью'),
        ('implantableDevice', 'Предназначено ли изделие для имплантации?', 'Опасности, связанные с биосовместимостью'),
        ('substanceRelease', 'Есть ли риск выделения веществ из материалов в организм?', 'Опасности, связанные с биосовместимостью'),
        ('sensitization', 'Есть ли риск сенсибилизации, раздражения или цитотоксичности?', 'Опасности, связанные с биосовместимостью'),
    ]),
    ('Опасности, связанные с безопасностью данных и систем', [
        ('containsSoftware', 'Содержит ли изделие программное обеспечение?', 'Опасности, связанные с безопасностью данных и систем'),
        ('dataExchange', 'Обменивается ли изделие данными с другими устройствами или сетями?', 'Опасности, связанные с безопасностью данных и систем'),
        ('wireless', 'Передаёт ли изделие информацию по беспроводной связи (Wi‑Fi, Bluetooth)?', 'Опасности, связанные с безопасностью данных и систем'),
        ('personalData', 'Хранит ли изделие персональные или медицинские данные?', 'Опасности, связанные с безопасностью данных и систем'),
        ('userInterface', 'Управляется ли изделие через интерфейс пользователя или сеть?', 'Опасности, связанные с безопасностью данных и систем'),
    ]),
    ('Опасности, связанные с электричеством', [
        ('activeDevice', 'Является ли изделие активным (использует источник энергии)?', 'Опасности, связанные с электричеством'),
        ('powerConnection', 'Подключается ли изделие к электросети или батарее?', 'Опасности, связанные с электричеством'),
        ('electricalContacts', 'Есть ли электрические контакты, которые могут соприкасаться с пользователем или пациентом?', 'Опасности, связанные с электричеством'),
    ]),
    ('Движущиеся части', [
        ('movingElements', 'Содержит ли изделие движущиеся механические элементы?', 'Опасности, связанные с движущимися частями'),
        ('movingRisk', 'Есть ли подвижные узлы, создающие риск защемления, раздавливания или травмы?', 'Опасности, связанные с движущимися частями'),
    ]),
    ('Излучение', [
        ('emitsEnergy', 'Излучает ли изделие энергию (ультразвук, инфракрасное, УФ, радиацию, лазер)?', 'Опасности, связанные с излучением'),
        ('opticalSystems', 'Использует ли изделие световые или оптические системы высокой интенсивности?', 'Опасности, связанные с излучением'),
    ]),
    ('Удобство использования', [
        ('specialTraining', 'Требуется ли специальное обучение для безопасного применения?', 'Опасности, связанные с удобством использования'),
        ('specialNeeds', 'Предусмотрено ли применение лицами с особыми потребностями?', 'Опасности, связанные с удобством использования'),
        ('interfaceError', 'Есть ли риск неправильного выбора режима или ошибки интерфейса?', 'Опасности, связанные с удобством использования'),
        ('alarms', 'Отображает ли изделие сигналы тревоги или предупреждения?', 'Опасности, связанные с удобством использования'),
    ]),
    ('Опасности, связанные с микробиологическими факторами', [
        ('isSterile', 'Изделие является стерильным?', 'Опасности, связанные с микробиологическими факторами'),
        ('reusable', 'Изделие многоразовое (повторная очистка и дезинфекция)?', 'Опасности, связанные с микробиологическими факторами'),
        ('biologicalContact', 'Имеет ли изделие контакт с биологическими жидкостями?', 'Опасности, связанные с микробиологическими факторами'),
    ]),
    ('Химические вещества', [
        ('chemicalSubstances', 'Содержит ли изделие химически активные вещества или реагенты?', 'Опасности, связанные с химическими веществами'),
        ('chemicalRelease', 'Возможен ли выброс, испарение или утечка химических веществ при эксплуатации?', 'Опасности, связанные с химическими веществами'),
        ('chemicalSterilization', 'Требует ли изделие стерилизации химическими агентами?', 'Опасности, связанные с химическими веществами'),
    ]),
    ('Ткани животного происхождения', [
        ('animalMaterials', 'Используются ли материалы или компоненты животного происхождения (коллаген, желатин и т.п.)?', 'Опасности, связанные с тканями животного происхождения'),
    ]),
    ('Наноматериалы', [
        ('nanomaterials', 'Содержит ли изделие наночастицы, нанопокрытия или наноструктуры?', 'Опасности, связанные с наноматериалами'),
    ]),
    ('Фармацевтические субстанции', [
        ('pharmaceutical', 'Содержит ли изделие лекарственные вещества или покрытия с высвобождением субстанции?', 'Опасности, связанные с фармацевтическими субстанциями'),
    ]),
    ('Воздействие окружающей среды', [
        ('environmentalSensitivity', 'Чувствительно ли изделие к температуре, влажности, пыли, вибрации или ЭМИ?', 'Опасности, связанные с воздействием окружающей среды'),
        ('environmentalImpact', 'Может ли изделие оказывать влияние на окружающую среду при утилизации?', 'Опасности, связанные с воздействием окружающей среды'),
    ]),
    ('Механические факторы', [
        ('mechanicalLoad', 'Подвержено ли изделие механическим нагрузкам, вибрации, ударам?', 'Опасности, связанные с механическими факторами'),
        ('destructionRisk', 'Есть ли риск разрушения, деформации, разгерметизации?', 'Опасности, связанные с механическими факторами'),
    ]),
    ('Термические воздействия', [
        ('heating', 'Может ли изделие нагреваться или охлаждаться при использовании?', 'Опасности, связанные с термическими воздействиями'),
        ('surfaceContact', 'Контактирует ли пользователь или пациент с горячими или холодными поверхностями?', 'Опасности, связанные с термическими воздействиями'),
    ]),
    ('Клиническое применение', [
        ('clinicalUse', 'Используется ли изделие в диагностике, лечении, реабилитации или мониторинге состояния пациента?', 'Опасности клинического применения'),
        ('clinicalError', 'Может ли ошибка применения привести к клиническим последствиям?', 'Опасности клинического применения'),
    ]),
]


def _safe_json_load(value, default):
    if value is None:
        return default
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed
        except (json.JSONDecodeError, TypeError):
            return default
    return default


def _normalize_project_lifecycle_stages(stages_raw):
    stages = _safe_json_load(stages_raw, [])
    if not isinstance(stages, list):
        return []
    normalized = []
    reverse = {v: k for k, v in LIFECYCLE_STAGE_LABELS.items()}
    reverse['Проектирование и разработка'] = 'design_development'
    for stage in stages:
        if not isinstance(stage, str):
            continue
        value = stage.strip()
        if not value:
            continue
        key = reverse.get(value, value)
        if key not in normalized:
            normalized.append(key)
    return normalized


def _format_lifecycle_stage_label(value):
    """Convert lifecycle stage code/name to human-readable Russian label."""
    if value is None:
        return ''
    text = str(value).strip()
    if not text:
        return ''

    # Remove legacy table prefix if present
    prefix = 'Управление рисками - '
    if text.startswith(prefix):
        text = text.replace(prefix, '', 1).strip()

    return LIFECYCLE_STAGE_LABELS.get(text, text)


def build_checklist_411_sections(project):
    lifecycle_stage_keys = _normalize_project_lifecycle_stages(getattr(project, 'lifecycle_stages', None))
    custom_lifecycle = _safe_json_load(getattr(project, 'custom_lifecycle_stages', None), [])
    if not isinstance(custom_lifecycle, list):
        custom_lifecycle = []
    custom_lifecycle = [str(x).strip() for x in custom_lifecycle if str(x).strip()]

    hazard_questions = _safe_json_load(getattr(project, 'hazard_questions', None), {})
    if not isinstance(hazard_questions, dict):
        hazard_questions = {}
    custom_hazards_raw = getattr(project, 'custom_hazard', '') or ''
    custom_hazards = [line.strip() for line in str(custom_hazards_raw).split('\n') if line.strip()]

    lifecycle_rows = [
        {
            'group': 'Этапы жизненного цикла',
            'item': label,
            'answer': 'Да' if key in lifecycle_stage_keys else 'Нет'
        }
        for key, label in LIFECYCLE_STAGE_LABELS.items()
        if key != 'other'
    ]
    lifecycle_rows.extend([
        {
            'group': 'Этапы жизненного цикла (пользовательские)',
            'item': value,
            'answer': 'Да'
        }
        for value in custom_lifecycle
    ])

    hazard_rows = []
    for group_name, questions in HAZARD_CHECKLIST_STRUCTURE:
        for question_key, question_label, mapped_hazard in questions:
            hazard_rows.append({
                'group': group_name,
                'item': f'{question_label}. {mapped_hazard}',
                'answer': 'Да' if bool(hazard_questions.get(question_key, False)) else 'Нет'
            })
    hazard_rows.extend([
        {
            'group': 'Пользовательские опасности',
            'item': value,
            'answer': 'Да'
        }
        for value in custom_hazards
    ])

    return lifecycle_rows, hazard_rows


def generate_checklist_411_html(project, include_hazards: bool = True):
    import html as html_module
    lifecycle_rows, hazard_rows = build_checklist_411_sections(project)

    def render_table(title, rows):
        if not rows:
            return f'<h5>{html_module.escape(title)}</h5><p class="empty-field">не заполнено</p>'
        html = [
            f'<h5>{html_module.escape(title)}</h5>',
            '<table class="checklist-table">',
            '<thead><tr><th>Группа</th><th>Пункт</th><th>Ответ</th></tr></thead><tbody>'
        ]
        for row in rows:
            html.append(
                '<tr>'
                f'<td>{html_module.escape(str(row.get("group", "")))}</td>'
                f'<td>{html_module.escape(str(row.get("item", "")))}</td>'
                f'<td><strong>{html_module.escape(str(row.get("answer", "Нет")))}</strong></td>'
                '</tr>'
            )
        html.append('</tbody></table>')
        return ''.join(html)

    html = render_table('Этапы жизненного цикла', lifecycle_rows)
    if include_hazards:
        html += render_table('Опасности проекта', hazard_rows)
    return html


def ensure_document_access(project: Project, current_user: User, db: Session):
    """Only users with report permission can open document endpoints."""
    if not check_project_access(project, current_user, db):
        raise HTTPException(status_code=403, detail="Access denied to this project")
    if not check_user_permission(current_user, "create_report", project.id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access documents in this project"
        )


def _flatten_risks_for_preview(risk_data: list) -> list:
    """Convert DB risk rows to flattened structure expected by HTML preview."""
    flattened = []
    for risk in risk_data or []:
        if not isinstance(risk, dict):
            continue
        data = risk.get('data', {})
        row = data.copy() if isinstance(data, dict) else {}
        row['table_name'] = risk.get('table_name', '')
        flattened.append(row)
    return flattened


def _parse_snapshot_data(doc_version: DocumentVersion) -> dict:
    """Safely parse snapshot_data JSON from a document version."""
    raw = getattr(doc_version, 'snapshot_data', None)
    if not raw:
        return {}
    try:
        if isinstance(raw, dict):
            return raw
        return json.loads(raw)
    except Exception:
        return {}


def _build_html_from_snapshot(snapshot: dict, doc_version: DocumentVersion) -> str:
    """Build HTML preview from snapshot context when pre-rendered HTML is absent."""
    if not isinstance(snapshot, dict):
        return ''

    html_preview = snapshot.get('html_preview')
    if isinstance(html_preview, str) and html_preview.strip():
        return html_preview

    project_data = snapshot.get('project_data')
    if not isinstance(project_data, dict):
        return ''

    flattened_risks = snapshot.get('flattened_risks')
    if not isinstance(flattened_risks, list):
        raw_risks = snapshot.get('risk_data')
        flattened_risks = _flatten_risks_for_preview(raw_risks if isinstance(raw_risks, list) else [])

    team_members = snapshot.get('team_members')
    if not isinstance(team_members, list):
        team_members = []

    project_obj = SimpleNamespace(**project_data)
    version_obj = SimpleNamespace(
        created_at=doc_version.created_at,
        report_number=doc_version.report_number,
        version=doc_version.version,
    )
    return generate_html_preview(project_obj, version_obj, flattened_risks, team_members)


def _html_to_pdf_bytes(html_content: str) -> bytes:
    """Convert HTML to PDF bytes using xhtml2pdf."""
    if not html_content:
        raise ValueError("Empty HTML content")

    try:
        from xhtml2pdf import pisa  # type: ignore[import-not-found]
    except Exception as import_error:
        raise ImportError("xhtml2pdf is not installed") from import_error

    from io import BytesIO
    output = BytesIO()
    prepared_html = _prepare_html_for_xhtml2pdf(html_content)
    result = pisa.CreatePDF(
        src=prepared_html,
        dest=output,
        encoding='utf-8',
        link_callback=_pisa_link_callback
    )
    if result.err:
        raise ValueError("HTML to PDF conversion failed")

    pdf_data = output.getvalue()
    if not pdf_data:
        raise ValueError("HTML to PDF conversion returned empty file")
    return pdf_data


def _build_live_preview_html(project: Project, project_id: int, db: Session, doc_version=None) -> str:
    """Build preview HTML from the current (live) project/risk state."""
    risk_tables = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project_id
    ).all()

    all_risks = []
    for table in risk_tables:
        rows = db.query(RiskTableRow).filter(
            RiskTableRow.table_id == table.id
        ).order_by(RiskTableRow.row_index).all()
        for row in rows:
            row_data = row.data if isinstance(row.data, dict) else {}
            row_data['table_name'] = _format_lifecycle_stage_label(table.name or table.sheet_id)
            all_risks.append(row_data)

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

    if not doc_version:
        doc_version = SimpleNamespace(
            created_at=datetime.now(),
            report_number=f"RMR-{datetime.now().year}-{project_id:02d}",
            version='draft'
        )

    return generate_html_preview(project, doc_version, all_risks, team_members)


def _build_generation_context(project, db: Session, version_number: str, report_number: str):
    project_data = {
        'id': project.id,
        'device_name': project.device_name,
        'device_model': project.device_model,
        'device_purpose': project.device_purpose,
        'device_description': project.device_description,
        'device_classification': project.device_classification,
        'intended_use': project.intended_use,
        'user_profile': project.user_profile,
        'operating_environment': project.operating_environment,
        'technical_specs': project.technical_specs,
        'regulatory_requirements': project.regulatory_requirements,
        'standards': project.standards,
        'lifecycle_stages': project.lifecycle_stages,
        'custom_lifecycle_stages': project.custom_lifecycle_stages,
        'hazard_questions': project.hazard_questions,
        'custom_hazard': project.custom_hazard,
        'active_hazard_categories': project.active_hazard_categories,
        # 14971 fields
        'indications': project.indications,
        'contraindications': project.contraindications,
        'target_group': project.target_group,
        'warnings': project.warnings,
        'disposal': project.disposal,
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
    }

    risk_tables = db.query(RiskManagementTable).filter(
        RiskManagementTable.project_id == project.id
    ).all()

    all_risks = []
    for table in risk_tables:
        rows = db.query(RiskTableRow).filter(
            RiskTableRow.table_id == table.id
        ).order_by(RiskTableRow.row_index).all()

        for row in rows:
            row_data = row.data if isinstance(row.data, dict) else {}
            all_risks.append({
                'id': row.id,
                'row_number': row.row_number,
                'data': row_data,
                'table_name': _format_lifecycle_stage_label(table.name or table.sheet_id)
            })

    team_members = []
    try:
        members = db.query(ProjectMember, User).join(
            User, ProjectMember.user_id == User.id
        ).filter(ProjectMember.project_id == project.id).all()

        for member, user in members:
            if user:
                team_members.append({
                    'name': f"{user.first_name or ''} {user.last_name or ''}".strip(),
                    'email': user.email or '',
                    'role': getattr(member.role, 'value', str(member.role)) if member.role else ''
                })

        owner = db.query(User).filter(User.id == project.owner_id).first()
        if owner and not any(m.get('email') == owner.email for m in team_members):
            team_members.append({
                'name': f"{owner.first_name or ''} {owner.last_name or ''}".strip(),
                'email': owner.email or '',
                'role': 'admin'
            })
    except Exception as e:
        print(f"DEBUG: Error gathering team members: {e}")
        team_members = []

    table_data = {
        'tables': []
    }
    for table in risk_tables:
        table_data['tables'].append({
            'name': table.name or table.sheet_id,
            'sheet_id': table.sheet_id
        })

    return project_data, all_risks, table_data, team_members


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

    # Check create_report permission
    if not check_user_permission(current_user, "create_report", project.id, db):
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
    
    project_data, all_risks, table_data, team_members = _build_generation_context(
        project,
        db,
        version_number,
        report_number
    )
    
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
        
        # Create immutable snapshot of the exact generation context
        flattened_risks = _flatten_risks_for_preview(all_risks)
        snapshot_project = SimpleNamespace(**project_data)
        snapshot_version = SimpleNamespace(
            created_at=datetime.now(),
            report_number=report_number,
            version=version_number,
        )
        html_preview_snapshot = generate_html_preview(
            snapshot_project,
            snapshot_version,
            flattened_risks,
            team_members
        )

        snapshot = {
            'project_data': project_data,
            'risk_data': all_risks,
            'flattened_risks': flattened_risks,
            'table_data': table_data,
            'team_members': team_members,
            'html_preview': html_preview_snapshot,
            'generated_at': datetime.now().isoformat(),
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
            title=f"Отчёт по управлению рисками - {project.device_name}",
            document_type="risk_management_report",
            file_data=file_data,
            file_name=file_name,
            file_size=len(file_data),
            snapshot_data=json.dumps(snapshot, ensure_ascii=False),
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
    
    ensure_document_access(project, current_user, db)
    
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
    
    ensure_document_access(project, current_user, db)
    
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
    format: str = "docx",
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
    
    ensure_document_access(project, current_user, db)

    # Check create_report permission
    if not check_user_permission(current_user, "create_report", project.id, db):
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
    
    requested_format = (format or "docx").lower()
    if requested_format not in {"docx", "pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported format")

    file_data = None
    media_type = None
    output_filename = doc_version.file_name or f"document_{doc_version.id}.{requested_format}"

    if requested_format == "docx":
        if doc_version.file_name.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Requested DOCX for a PDF version")
        if not doc_version.file_data:
            raise HTTPException(status_code=404, detail="Document file not found")
        file_data = doc_version.file_data
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        if doc_version.file_name.lower().endswith(".pdf") and doc_version.file_data:
            file_data = doc_version.file_data
            output_filename = doc_version.file_name
        else:
            snapshot = _parse_snapshot_data(doc_version)
            html_from_snapshot = _build_html_from_snapshot(snapshot, doc_version)

            if html_from_snapshot:
                try:
                    file_data = _html_to_pdf_bytes(html_from_snapshot)
                except Exception:
                    file_data = None
            else:
                file_data = None

            if not file_data:
                project_data = snapshot.get('project_data') if isinstance(snapshot, dict) else None
                all_risks = snapshot.get('risk_data') if isinstance(snapshot, dict) else None
                table_data = snapshot.get('table_data') if isinstance(snapshot, dict) else None
                team_members = snapshot.get('team_members') if isinstance(snapshot, dict) else None

                if not isinstance(project_data, dict) or not isinstance(all_risks, list) or not isinstance(table_data, dict) or not isinstance(team_members, list):
                    project_data, all_risks, table_data, team_members = _build_generation_context(
                        project,
                        db,
                        doc_version.version,
                        doc_version.report_number
                    )

                from ..services.document_generator import PDFRiskManagementReportGenerator
                generator = PDFRiskManagementReportGenerator(
                    project_data=project_data,
                    risk_data=all_risks,
                    table_data=table_data,
                    team_members=team_members
                )
                file_stream = generator.generate()
                file_data = file_stream.read()

            output_filename = f"Risk_Management_Report_{project.device_name}_{doc_version.version}.pdf".replace(' ', '_')
        media_type = "application/pdf"

    # Create a safe ASCII filename for headers
    try:
        import unicodedata
        import re

        safe_filename = unicodedata.normalize('NFKD', output_filename)
        safe_filename = ''.join(c for c in safe_filename if ord(c) < 128)
        safe_filename = re.sub(r'[^\w\-_\. ]', '_', safe_filename)
        safe_filename = re.sub(r'_+', '_', safe_filename)

        if not safe_filename or len(safe_filename) < 5:
            safe_filename = f"document_{doc_version.id}.{requested_format}"
    except Exception as e:
        print(f"DEBUG: Filename encoding failed: {e}, using fallback")
        safe_filename = f"document_{doc_version.id}.{requested_format}"

    return Response(
        content=file_data,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Type": media_type,
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
    
    ensure_document_access(project, current_user, db)
    
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
    
    # First try immutable snapshot preview for this exact version
    snapshot = _parse_snapshot_data(doc_version)
    html_snapshot = _build_html_from_snapshot(snapshot, doc_version)
    if html_snapshot:
        return HTMLResponse(
            content=html_snapshot,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true"
            }
        )

    # Legacy fallback for old versions without snapshot_data
    html_content = _build_live_preview_html(project, project_id, db, doc_version=doc_version)
    
    # Return HTML with CORS headers
    return HTMLResponse(
        content=html_content,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true"
        }
    )


@router.get("/projects/{project_id}/preview-live")
async def preview_document_live(
    project_id: int,
    version_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Live preview from current project/risk data (not fixed to version snapshot).
    Used for working preview before clicking "Generate New Version".
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ensure_document_access(project, current_user, db)

    doc_version = None
    if version_id is not None:
        doc_version = db.query(DocumentVersion).filter(
            DocumentVersion.id == version_id,
            DocumentVersion.project_id == project_id
        ).first()

    html_content = _build_live_preview_html(project, project_id, db, doc_version=doc_version)

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
                lifecycle_stages_raw = json.loads(project.lifecycle_stages)
            else:
                lifecycle_stages_raw = project.lifecycle_stages
        else:
            lifecycle_stages_raw = []
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"DEBUG: Error parsing lifecycle_stages: {e}")
        lifecycle_stages_raw = []

    # Map short keys to full names for display
    lifecycle_mapping = {
        'design_development': 'Проектирование и разработка',
        'procurement': 'Закупка и входной контроль компонентов и материалов',
        'production': 'Производство и сборка',
        'packaging': 'Упаковка и маркировка',
        'transportation': 'Транспортировка и дистрибуция',
        'storage': 'Хранение',
        'installation': 'Монтаж',
        'sterilization': 'Стерилизация',
        'testing': 'Испытания и выпуск продукции',
        'commissioning': 'Установка и ввод в эксплуатацию',
        'operation': 'Эксплуатация',
        'maintenance': 'Техническое обслуживание и сервис',
        'decommissioning': 'Демонтаж и вывод из эксплуатации',
        'disposal': 'Утилизация и уничтожение изделия или его компонентов',
        'other': 'Другие',
    }
    
    # Convert raw keys to full names
    lifecycle_stages = []
    if lifecycle_stages_raw:
        for stage_key in lifecycle_stages_raw:
            if isinstance(stage_key, str):
                if stage_key.strip() == 'other':
                    continue
                full_name = lifecycle_mapping.get(stage_key, stage_key)
                lifecycle_stages.append(full_name)

    custom_lifecycle_stages = _safe_json_load(getattr(project, 'custom_lifecycle_stages', None), [])
    if isinstance(custom_lifecycle_stages, list):
        for custom_stage in custom_lifecycle_stages:
            custom_stage_value = str(custom_stage).strip()
            if custom_stage_value:
                lifecycle_stages.append(custom_stage_value)
    
    # Safely parse hazard_questions
    try:
        if project.hazard_questions:
            if isinstance(project.hazard_questions, str):
                hazard_questions = json.loads(project.hazard_questions)
            else:
                hazard_questions = project.hazard_questions
        else:
            hazard_questions = {}
    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        print(f"DEBUG: Error parsing hazard_questions: {e}")
        hazard_questions = {}
    
    # Extract hazard categories from answers
    hazard_categories = []
    if hazard_questions:
        for key, value in hazard_questions.items():
            if value and key not in ['lifecycle_design', 'lifecycle_procurement', 'lifecycle_production', 
                                   'lifecycle_packaging', 'lifecycle_transportation', 'lifecycle_storage',
                                   'lifecycle_installation', 'lifecycle_use', 'lifecycle_maintenance',
                                   'lifecycle_decontamination', 'lifecycle_disposal', 'lifecycle_training',
                                   'lifecycle_documentation', 'lifecycle_postmarket']:
                # Map question keys to category names
                if key in ['active', 'wireless', 'powerConnection', 'electricalContacts', 'emitsEnergy', 
                          'opticalSystems', 'activeDevice']:
                    category = 'Электрическая энергия'
                elif key in ['sterile', 'disposable', 'implantable', 'bodyContact', 'implantableDevice',
                           'sensitization', 'isSterile', 'reusable', 'biologicalContact', 'animalMaterials']:
                    category = 'Биосовместимость'
                elif key in ['software', 'containsSoftware', 'dataExchange', 'personalData', 'userInterface',
                           'specialTraining', 'specialNeeds', 'interfaceError', 'alarms', 'reliability']:
                    category = 'Программное обеспечение'
                elif key in ['materialContact', 'substanceRelease', 'chemicalSubstances', 'chemicalRelease',
                           'chemicalSterilization']:
                    category = 'Химические вещества'
                elif key in ['movingElements', 'movingRisk', 'mechanicalLoad', 'destructionRisk']:
                    category = 'Механические факторы'
                elif key in ['heating', 'surfaceContact']:
                    category = 'Термические воздействия'
                elif key == 'nanomaterials':
                    category = 'Наноматериалы'
                elif key == 'pharmaceutical':
                    category = 'Фармацевтические субстанции'
                elif key in ['environmentalSensitivity', 'environmentalImpact']:
                    category = 'Воздействие окружающей среды'
                elif key in ['clinicalUse', 'clinicalError', 'clinicalValidation']:
                    category = 'Клиническое применение'
                else:
                    continue
                
                if category not in hazard_categories:
                    hazard_categories.append(category)

    custom_hazards_raw = getattr(project, 'custom_hazard', '') or ''
    custom_hazards = [line.strip() for line in str(custom_hazards_raw).split('\n') if line.strip()]
    for custom_hazard in custom_hazards:
        if custom_hazard not in hazard_categories:
            hazard_categories.append(custom_hazard)

    plan_62_table_html = generate_risks_table([{}], ['lifecycle_stage', 'hazard', 'control_measures'])
    plan_72_table_html = generate_residual_risks_table([{}])

    intended_use_value = getattr(project, 'intended_use', None) or getattr(project, 'device_purpose', None)

    intended_use_table_html = f"""
            <table class="info-table">
                <tr><th colspan="2">Назначение / разумно прогнозируемое неправильное применение</th></tr>
                <tr><td>Назначение</td><td>{get_field(intended_use_value)}</td></tr>
                <tr><td>Медицинские показания</td><td>{get_field(getattr(project, 'indications', None))}</td></tr>
                <tr><td>Целевая группа пациентов</td><td>{get_field(getattr(project, 'target_group', None))}</td></tr>
                <tr><td>Предполагаемые пользователи</td><td>{get_field(getattr(project, 'user_profile', None))}</td></tr>
                <tr><td>Среда применения</td><td>{get_field(getattr(project, 'operating_environment', None))}</td></tr>
                <tr><td>Противопоказания</td><td>{get_field(getattr(project, 'contraindications', None))}</td></tr>
                <tr><td>Ограничения</td><td>{get_field(getattr(project, 'regulatory_requirements', None))}</td></tr>
            </table>
    """

    empty_misuse_table_html = """
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Сценарий misuse</th>
                        <th>Причина / механизм</th>
                        <th>Потенциальный вред</th>
                        <th>Этап ЖЦ</th>
                        <th>Комментарий</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colspan="6">Список misuse пока не заполнен.</td>
                    </tr>
                </tbody>
            </table>
    """

    # Map question keys to display names for HTML preview
    question_mapping = {
        'active': 'Активное медицинское изделие (работает с электрической энергией)',
        'wireless': 'Беспроводная связь',
        'powerConnection': 'Подключение к электропитанию',
        'electricalContacts': 'Электрические контакты',
        'emitsEnergy': 'Изделие излучает энергию',
        'opticalSystems': 'Оптические системы',
        'activeDevice': 'Активное устройство',
        'sterile': 'Стерильное изделие',
        'disposable': 'Одноразовое изделие',
        'implantable': 'Имплантируемое изделие',
        'bodyContact': 'Контакт с телом пациента',
        'implantableDevice': 'Имплантируемое устройство',
        'sensitization': 'Потенциальная сенсибилизация',
        'isSterile': 'Изделие стерильно',
        'reusable': 'Многоразовое использование',
        'biologicalContact': 'Биологический контакт',
        'animalMaterials': 'Материалы животного происхождения',
        'software': 'Изделие с программным обеспечением',
        'containsSoftware': 'Содержит программное обеспечение',
        'dataExchange': 'Обмен данными с другими системами',
        'personalData': 'Обработка персональных данных',
        'userInterface': 'Пользовательский интерфейс',
        'specialTraining': 'Требуется специальная подготовка персонала',
        'specialNeeds': 'Особые потребности пользователей',
        'interfaceError': 'Ошибки интерфейса',
        'alarms': 'Система оповещения/тревоги',
        'reliability': 'Надежность и отказоустойчивость',
        'materialContact': 'Контакт с материалами/веществами',
        'substanceRelease': 'Выделение веществ',
        'chemicalSubstances': 'Химические вещества в составе',
        'chemicalRelease': 'Выделение химических веществ',
        'chemicalSterilization': 'Химическая стерилизация',
        'movingElements': 'Движущиеся элементы',
        'movingRisk': 'Риск от движущихся частей',
        'mechanicalLoad': 'Механические нагрузки',
        'destructionRisk': 'Риск разрушения',
        'heating': 'Тепловое воздействие',
        'surfaceContact': 'Контакт с поверхностями',
        'nanomaterials': 'Наноматериалы',
        'pharmaceutical': 'Фармацевтические субстанции',
        'environmentalSensitivity': 'Чувствительность к окружающей среде',
        'environmentalImpact': 'Воздействие на окружающую среду',
        'clinicalUse': 'Клиническое применение',
        'clinicalError': 'Клинические ошибки',
        'clinicalValidation': 'Клиническая валидация'
    }
    
    date_str = doc_version.created_at.strftime('%d %B %Y') if doc_version.created_at else '<span class="empty-field">не заполнено</span>'
    
    # Calculate risk statistics and dynamic conclusions
    def to_int_or_none(value):
        if value is None:
            return None
        value_str = str(value).strip()
        if value_str == '':
            return None
        try:
            return int(value_str)
        except ValueError:
            try:
                return int(float(value_str))
            except (ValueError, TypeError):
                return None

    risk_threshold = getattr(project, 'risk_threshold', 10) if hasattr(project, 'risk_threshold') else 10
    total_risks = len(risks) if risks else 0

    evaluated_initial = 0
    acceptable_initial = 0
    unacceptable_initial = 0

    evaluated_residual = 0
    acceptable_residual = 0
    unacceptable_residual = 0

    if risks:
        for risk in risks:
            s_init = to_int_or_none(risk.get('severity_score', risk.get('severity_initial')))
            p_init = to_int_or_none(risk.get('probability_score', risk.get('probability_initial')))
            if s_init is not None and p_init is not None and s_init > 0 and p_init > 0:
                evaluated_initial += 1
                initial_score = s_init * p_init
                if initial_score < risk_threshold:
                    acceptable_initial += 1
                else:
                    unacceptable_initial += 1

            s_res = to_int_or_none(risk.get('residual_risk_level', risk.get('severity_residual')))
            p_res = to_int_or_none(risk.get('residual_probability', risk.get('probability_residual')))
            if s_res is not None and p_res is not None and s_res > 0 and p_res > 0:
                evaluated_residual += 1
                residual_score = s_res * p_res
                if residual_score < risk_threshold:
                    acceptable_residual += 1
                else:
                    unacceptable_residual += 1

    open_risks = max(total_risks - evaluated_residual, 0)

    if total_risks == 0:
        reviewed_line = 'Идентифицированные риски отсутствуют; оценка рисков в таблицах не требуется.'
    elif evaluated_initial == total_risks:
        reviewed_line = 'Все идентифицированные риски были рассмотрены и оценены в соответствии с требованиями ISO 14971:2019.'
    elif evaluated_initial == 0:
        reviewed_line = 'Идентифицированные риски не были оценены в таблице анализа рисков.'
    else:
        reviewed_line = f'Идентифицированные риски рассмотрены частично: оценено {evaluated_initial} из {total_risks}.'

    risk_count_line = (
        f'Идентифицировано рисков – {total_risks}; '
        f'из них приемлемых - {acceptable_initial}; '
        f'неприемлемых - {unacceptable_initial}.'
    )

    if total_risks == 0:
        controls_line = 'Меры контроля риска не требуются, так как идентифицированные риски отсутствуют.'
    elif evaluated_initial < total_risks:
        controls_line = 'Эффективность мер контроля риска не подтверждена для всех рисков, так как часть рисков не оценена.'
    elif unacceptable_initial == 0:
        controls_line = 'Все меры контроля риска внедрены, проверены и признаны эффективными.'
    else:
        controls_line = 'Не все меры контроля риска признаны эффективными, так как остаются неприемлемые риски.'

    if total_risks == 0:
        residual_line = 'Остаточные риски отсутствуют.'
    elif evaluated_residual < total_risks:
        residual_line = (
            f'Не все остаточные риски оценены: оценено {evaluated_residual} из {total_risks}; '
            f'не закрытых рисков - {open_risks}.'
        )
    elif unacceptable_residual == 0:
        residual_line = 'Все остаточные риски находятся на приемлемом уровне или в зоне ALARP.'
    else:
        residual_line = (
            f'Не все остаточные риски находятся на приемлемом уровне: '
            f'неприемлемых остаточных рисков - {unacceptable_residual}.'
        )

    overall_risk_acceptable = total_risks == 0 or (open_risks == 0 and unacceptable_residual == 0)
    if overall_risk_acceptable:
        overall_line = 'Совокупный остаточный риск признан приемлемым в контексте назначения изделия и ожидаемой пользы.'
    else:
        overall_line = 'Совокупный остаточный риск не может быть признан приемлемым до закрытия всех открытых и/или неприемлемых рисков.'

    if overall_risk_acceptable:
        conclusion_main_line = (
            f'На момент утверждения данного отчёта совокупный остаточный риск изделия {get_field(project.device_name)} '
            'считается приемлемым.'
        )
        conclusion_process_line = 'Процесс управления рисками реализован в полном соответствии с ISO 14971:2019.'
    else:
        reasons = []
        if open_risks > 0:
            reasons.append(f'не закрытые риски: {open_risks}')
        if unacceptable_residual > 0:
            reasons.append(f'неприемлемые остаточные риски: {unacceptable_residual}')
        if not reasons and unacceptable_initial > 0:
            reasons.append(f'неприемлемые оцененные риски: {unacceptable_initial}')
        reason_text = '; '.join(reasons) if reasons else 'требуются дополнительные мероприятия по управлению рисками'
        conclusion_main_line = (
            f'На момент утверждения данного отчёта изделие {get_field(project.device_name)} не может быть допущено к реализации, '
            f'поскольку выявлены {reason_text}.'
        )
        conclusion_process_line = 'Процесс управления рисками не завершён: требуется закрытие и повторная оценка всех проблемных рисков.'

    plan_block_html = f"""
        <h1>ПЛАН УПРАВЛЕНИЯ РИСКАМИ</h1>

        <div class="section">
            <h2>1. ТИТУЛЬНЫЙ ЛИСТ</h2>
            <p><strong>Медицинское изделие:</strong> {get_field(project.device_name)}</p>
            <p><strong>Номер отчёта:</strong> {get_field(doc_version.report_number)}</p>
            <p><strong>Редакция:</strong> {get_field(doc_version.version)}</p>
            <p><strong>Дата:</strong> {date_str}</p>
        </div>

        <div class="section">
            <h2>2. СОДЕРЖАНИЕ</h2>
            <table class="info-table">
                <tr><td>1</td><td>ТИТУЛЬНЫЙ ЛИСТ</td><td>1</td></tr>
                <tr><td>2</td><td>СОДЕРЖАНИЕ</td><td>2</td></tr>
                <tr><td>3</td><td>ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ</td><td>3</td></tr>
                <tr><td>4</td><td>ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ</td><td>4</td></tr>
                <tr><td>5</td><td>АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)</td><td>5</td></tr>
                <tr><td>6</td><td>МЕРЫ УПРАВЛЕНИЯ РИСКАМИ</td><td>6</td></tr>
                <tr><td>7</td><td>ОЦЕНКА ОСТАТОЧНОГО РИСКА</td><td>7</td></tr>
                <tr><td>8</td><td>ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА</td><td>8</td></tr>
                <tr><td>9</td><td>СОСТАВ КОМАНДЫ ПО МЕНЕДЖМЕНТУ РИСКОВ</td><td>9</td></tr>
                <tr><td>10</td><td>ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ</td><td>10</td></tr>
            </table>
        </div>

        <div class="section">
            <h2>3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ</h2>
            <table class="info-table">
                <tr><td>Наименование изделия</td><td>{get_field(project.device_name)}</td></tr>
                <tr><td>Модель / Тип</td><td>{get_field(project.device_model)}</td></tr>
                <tr><td>Класс риска</td><td>{get_field(project.device_classification)}</td></tr>
                <tr><td>Условия эксплуатации</td><td>{get_field(project.operating_environment)}</td></tr>
                <tr><td>Применяемые стандарты и регламенты</td><td>{get_field(project.standards)}</td></tr>
                <tr><td>Периодичность пересмотра</td><td>По мере обновления проекта, существенных изменений изделия или поступления новой информации.</td></tr>
                <tr><td>Этапы жизненного цикла</td><td>{', '.join([escape_html(s) for s in lifecycle_stages]) if lifecycle_stages else '<span class="empty-field">не заполнено</span>'}</td></tr>
            </table>
            {intended_use_table_html}
            {empty_misuse_table_html}
            {generate_disposal_and_warnings(project)}
        </div>

        <div class="section">
            <h2>4. ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ</h2>
            <h3>4.1 Цель раздела</h3>
            <p>Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.</p>
            <h4>4.1.1 Ответы на вопросы чек-листа</h4>
            {generate_checklist_411_html(project, include_hazards=False)}
            <h3>4.2 Резюме раздела</h3>
            <p>Идентифицированы основные опасности, связанные с {', '.join([escape_html(c) for c in hazard_categories]) if hazard_categories else '<span class="empty-field">не заполнено</span>'}</p>
            <p>Для каждой опасности будет проведён анализ риска (раздел 5) с оценкой тяжести и вероятности, а также определены меры контроля (раздел 6).</p>
        </div>

        <div class="section">
            <h2>5. АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)</h2>
            <h3>5.1 Методология оценки</h3>
            <p>Для анализа рисков используется качественно-количественная методика </p>
            <p><strong>Риск = вероятность × тяжесть</strong></p>
            <p><strong>Тяжесть вреда (S):</strong></p>
            {generate_severity_table(project)}
            <p><strong>Вероятность возникновения (P):</strong></p>
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
        </div>

        <div class="section">
            <h2>6. МЕРЫ УПРАВЛЕНИЯ РИСКАМИ</h2>
            <h3>6.1 Цель раздела</h3>
            <p>Определить и задокументировать меры, применённые для снижения или устранения рисков, связанных с выявленными опасными ситуациями.</p>
            <h3>6.2 Таблица мер управления рисками</h3>
            {plan_62_table_html}
        </div>

        <div class="section">
            <h2>7. ОЦЕНКА ОСТАТОЧНОГО РИСКА</h2>
            <h3>7.1 Цель раздела</h3>
            <p>Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми в соответствии с установленными критериями риск-аппетита организации и принципом ALARP</p>
            <h3>7.2 Таблица оценки остаточных рисков</h3>
            {plan_72_table_html}
        </div>

        <div class="section">
            <h2>8. ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА</h2>
            <h3>8.1 Цель раздела</h3>
            <p>Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение польза/риск, как требует ISO 14971:2019, п. 8.3.</p>
        </div>

        <div class="section">
            <h2>9. СОСТАВ КОМАНДЫ ПО МЕНЕДЖМЕНТУ РИСКОВ</h2>
            <h3>9.1 Состав команды по менеджменту рисков</h3>
            {generate_team_table(team_members, date_str) if team_members else '<p class="empty-field">Команда проекта не заполнена</p>'}
        </div>

        <div class="section">
            <h2>10. ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ</h2>
            <h3>10.1 Ссылки и нормативные документы</h3>
            <table>
                <tr><th>№</th><th>Документ / Стандарт</th><th>Наименование</th></tr>
                <tr><td>1</td><td>ISO 14971:2019</td><td>Медицинские изделия — Применение менеджмента риска к медицинским изделиям</td></tr>
                <tr><td>2</td><td>ISO 13485:2016</td><td>Системы менеджмента качества — Требования для целей регулирования</td></tr>
                <tr><td>3</td><td>MDR 2017/745</td><td>Регламент (ЕС) 2017/745 о медицинских изделиях</td></tr>
                <tr><td>4</td><td>ISO 10993-1:2020</td><td>Биологическая оценка медицинских изделий — Часть 1</td></tr>
                <tr><td>5</td><td>ISO 17664:2017</td><td>Обработка продукции для здравоохранения — Информация, предоставляемая производителем</td></tr>
                <tr><td>6</td><td>Company SOP QMS-RM-001</td><td>Процедура управления рисками</td></tr>
                <tr><td>7</td><td>IFU-CP-01</td><td>Инструкция по применению — Контейнер для очистки</td></tr>
            </table>
            <h3>10.2 Управление документом</h3>
            <table class="info-table">
                <tr><td>Название документа</td><td>Отчёт по управлению рисками — {get_field(project.device_name)}</td></tr>
                <tr><td>Номер документа</td><td>{get_field(doc_version.report_number)}</td></tr>
                <tr><td>Редакция</td><td>{get_field(doc_version.version)}</td></tr>
                <tr><td>Статус</td><td>Утверждён</td></tr>
                <tr><td>Дата вступления в силу</td><td>{date_str.replace(' ', '.') if isinstance(date_str, str) and 'не заполнено' not in date_str else date_str}</td></tr>
                <tr><td>Местоположение контролируемой копии</td><td>Репозиторий СМК / Папка: "Управление рисками"</td></tr>
            </table>
        </div>
    """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Отчёт по управлению рисками - {escape_html(project.device_name or 'N/A')}</title>
        <style>
            body {{
                font-family: 'Times New Roman', serif;
                margin: 20px;
                line-height: 1.3;
                background: #fff;
                font-size: 10px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            }}
            h1 {{
                color: #1f2937;
                border-bottom: 1px solid #6366f1;
                padding-bottom: 5px;
                text-align: center;
                font-size: 14px;
                margin: 10px 0;
            }}
            h2 {{
                color: #374151;
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 12px;
                page-break-after: avoid;
            }}
            h3 {{
                color: #4b5563;
                margin-top: 10px;
                margin-bottom: 5px;
                font-size: 11px;
                page-break-after: avoid;
            }}
            p {{
                margin: 3px 0;
                text-align: justify;
                word-wrap: break-word;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 5px 0;
                page-break-inside: avoid;
                font-size: 8px;
            }}
            th, td {{
                border: 1px solid #d1d5db;
                padding: 2px 4px;
                text-align: left;
                vertical-align: top;
                word-wrap: break-word;
            }}
            th {{
                background-color: #f3f4f6;
                font-weight: bold;
                font-size: 8px;
            }}
            .empty-field {{
                color: #9ca3af;
                font-style: italic;
                font-size: 8px;
            }}
            .section {{
                margin-bottom: 15px;
                page-break-inside: avoid;
            }}
            .info-table {{
                width: 100%;
                font-size: 9px;
            }}
            .info-table td:first-child {{
                font-weight: bold;
                width: 150px;
            }}
            ul {{
                margin: 3px 0;
                padding-left: 15px;
            }}
            li {{
                margin: 2px 0;
                word-wrap: break-word;
            }}
            .toc-table {{
                font-size: 9px;
                margin: 5px 0;
            }}
            .toc-table th, .toc-table td {{
                padding: 2px;
                font-size: 8px;
            }}
            .page-break {{
                page-break-before: always;
                border-top: 1px dashed #d1d5db;
                margin: 16px 0;
            }}
        </style>
    </head>
    <body>
        {plan_block_html}
        <div class="page-break"></div>
        <h1>ОТЧЁТ ПО УПРАВЛЕНИЮ РИСКАМИ</h1>
        
        <!-- 1. ТИТУЛЬНЫЙ ЛИСТ -->
        <div class="section">
            <h2>1. ТИТУЛЬНЫЙ ЛИСТ</h2>
            <p><strong>Медицинское изделие:</strong> {get_field(project.device_name)}</p>
            <p><strong>Номер отчёта:</strong> {get_field(doc_version.report_number)}</p>
            <p><strong>Редакция:</strong> {get_field(doc_version.version)}</p>
            <p><strong>Дата:</strong> {date_str}</p>
        </div>
        
        <!-- 2. СОДЕРЖАНИЕ -->
        <div class="section">
            <h2>2. СОДЕРЖАНИЕ</h2>
            <table class="info-table">
                <tr><td>1</td><td>ТИТУЛЬНЫЙ ЛИСТ</td><td>1</td></tr>
                <tr><td>2</td><td>СОДЕРЖАНИЕ</td><td>2</td></tr>
                <tr><td>3</td><td>ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ</td><td>3</td></tr>
                <tr><td>4</td><td>ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ</td><td>4</td></tr>
                <tr><td>5</td><td>АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)</td><td>5</td></tr>
                <tr><td>6</td><td>МЕРЫ УПРАВЛЕНИЯ РИСКАМИ</td><td>6</td></tr>
                <tr><td>7</td><td>ОЦЕНКА ОСТАТОЧНОГО РИСКА</td><td>7</td></tr>
                <tr><td>8</td><td>ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА</td><td>8</td></tr>
                <tr><td>9</td><td>ВЫВОДЫ И УТВЕРЖДЕНИЕ</td><td>9</td></tr>
                <tr><td>10</td><td>ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ</td><td>10</td></tr>
            </table>
        </div>
        
        <!-- 3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ -->
        <div class="section">
            <h2>3. ИДЕНТИФИКАЦИЯ ИЗДЕЛИЯ И НАЗНАЧЕНИЕ</h2>
            <table class="info-table">
                <tr><td>Наименование изделия</td><td>{get_field(project.device_name)}</td></tr>
                <tr><td>Модель / Тип</td><td>{get_field(project.device_model)}</td></tr>
                <tr><td>Класс риска</td><td>{get_field(project.device_classification)}</td></tr>
                <tr><td>Условия эксплуатации</td><td>{get_field(project.operating_environment)}</td></tr>
                <tr><td>Применяемые стандарты и регламенты</td><td>{get_field(project.standards)}</td></tr>
                <tr><td>Периодичность пересмотра</td><td>По мере обновления проекта, существенных изменений изделия или поступления новой информации.</td></tr>
                <tr><td>Этапы жизненного цикла</td><td>{', '.join([escape_html(s) for s in lifecycle_stages]) if lifecycle_stages else '<span class="empty-field">не заполнено</span>'}</td></tr>
            </table>

            {intended_use_table_html}
            {empty_misuse_table_html}
            
            <!-- Disposal and Warnings -->
            {generate_disposal_and_warnings(project)}
        </div>
        
        <!-- 4. Идентификация опасностей -->
        <div class="section">
            <h2>4. ИДЕНТИФИКАЦИЯ ОПАСНОСТЕЙ</h2>
            <h3>4.1 Цель раздела</h3>
            <p>Определить все разумно предсказуемые опасности, возникающие на этапах жизненного цикла изделия - от проектирования и производства до эксплуатации, очистки, транспортировки, утилизации.</p>
            
            <!-- Render checklist answers -->
            <h4>4.1.1 Ответы на вопросы чек-листа</h4>
            {generate_checklist_411_html(project)}

            <h3>4.2 Таблица идентифицированных опасностей</h3>
            {generate_risks_table(risks, ['table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm']) if risks else '<p class="empty-field">Таблица опасностей не заполнена</p>'}
            
            <h3>4.3 Резюме раздела</h3>
            <p>Идентифицированы основные опасности, связанные с {', '.join([escape_html(c) for c in hazard_categories]) if hazard_categories else '<span class="empty-field">не заполнено</span>'}</p>
            <p>Для каждой опасности будет проведён анализ риска (раздел 5) с оценкой тяжести и вероятности, а также определены меры контроля (раздел 6).</p>
        </div>
        
        <!-- 5. Анализ рисков -->
        <div class="section">
            <h2>5. АНАЛИЗ РИСКОВ (ДО ПРИМЕНЕНИЯ МЕР КОНТРОЛЯ)</h2>
            <h3>5.1 Методология оценки</h3>
            <p>Для анализа рисков используется качественно-количественная методика </p>
            <p><strong>Риск = вероятность × тяжесть</strong></p>
            
            <p><strong>Тяжесть вреда (S):</strong></p>
            {generate_severity_table(project)}
            <p><strong>Вероятность возникновения (P):</strong></p>
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


            
        </div>
        
        <!-- 6. Меры управления рисками -->
        <div class="section">
            <h2>6. МЕРЫ УПРАВЛЕНИЯ РИСКАМИ</h2>
            <h3>6.1 Цель раздела</h3>
            <p>Определить и задокументировать меры, применённые для снижения или устранения рисков, связанных с выявленными опасными ситуациями.</p>
            
            <h3>6.2 Таблица мер управления рисками</h3>
            {generate_risks_table(risks, ['lifecycle_stage', 'hazard', 'control_measures']) if risks else '<p class="empty-field">Таблица мер управления рисками не заполнена</p>'}
        </div>
        
        <!-- 7. Оценка остаточного риска -->
        <div class="section">
            <h2>7. ОЦЕНКА ОСТАТОЧНОГО РИСКА</h2>
            <h3>7.1 Цель раздела</h3>
            <p>Определить, являются ли остаточные риски (после реализации мер контроля) приемлемыми в соответствии с установленными критериями риск-аппетита организации и принципом ALARP</p>
            
            <h3>7.2 Таблица оценки остаточных рисков</h3>
            {generate_residual_risks_table(risks) if risks else '<p class="empty-field">Таблица остаточных рисков не заполнена</p>'}
            
        </div>
        
        <!-- 8. Оценка совокупного остаточного риска -->
        <div class="section">
            <h2>8. ОЦЕНКА ПРИЕМЛЕМОСТИ СОВОКУПНОГО ОСТАТОЧНОГО РИСКА</h2>
            <h3>8.1 Цель раздела</h3>
            <p>Определить, является ли совокупный остаточный риск медицинского изделия приемлемым, учитывая все идентифицированные индивидуальные риски, их взаимное влияние и соотношение польза/риск, как требует ISO 14971:2019, п. 8.3.</p>
            
        </div>
        
        <!-- 9. Выводы -->
        <div class="section">
            <h2>9. ВЫВОДЫ И УТВЕРЖДЕНИЕ</h2>
            <h3>9.1 Общие выводы</h3>
            <p>На основании проведённого процесса идентификации опасностей, анализа, оценки и управления рисками, подтверждено, что:</p>
            <ul>
                <li>{reviewed_line}</li>
                <li>{risk_count_line}</li>
                <li>{controls_line}</li>
                <li>{residual_line}</li>
                <li>{overall_line}</li>
                <li>Документация по управлению рисками является полной, прослеживаемой и согласована с системой менеджмента качества, соответствующей ISO 13485:2016;</li>
                <li>Постпроизводственная информация (PMS, жалобы, CAPA) будет регулярно анализироваться для пересмотра оценки рисков.</li>
            </ul>
            
            <h3>9.2 Заключение</h3>
            <p><strong>Заключение:</strong></p>
            <p>{conclusion_main_line}</p>
            <p>{conclusion_process_line}</p>
            
            <h3>9.3 Состав команды по менеджменту рисков, согласовывание и утверждения отчета</h3>
            {generate_team_table(team_members, date_str) if team_members else '<p class="empty-field">Команда проекта не заполнена</p>'}
        </div>
        
        <!-- 10. Ссылки -->
        <div class="section">
            <h2>10. ССЫЛКИ И УПРАВЛЕНИЕ ДОКУМЕНТОМ</h2>
            <h3>10.1 Ссылки и нормативные документы</h3>
            <table>
                <tr><th>№</th><th>Документ / Стандарт</th><th>Наименование</th></tr>
                <tr><td>1</td><td>ISO 14971:2019</td><td>Медицинские изделия — Применение менеджмента риска к медицинским изделиям</td></tr>
                <tr><td>2</td><td>ISO 13485:2016</td><td>Системы менеджмента качества — Требования для целей регулирования</td></tr>
                <tr><td>3</td><td>MDR 2017/745</td><td>Регламент (ЕС) 2017/745 о медицинских изделиях</td></tr>
                <tr><td>4</td><td>ISO 10993-1:2020</td><td>Биологическая оценка медицинских изделий — Часть 1</td></tr>
                <tr><td>5</td><td>ISO 17664:2017</td><td>Обработка продукции для здравоохранения — Информация, предоставляемая производителем</td></tr>
                <tr><td>6</td><td>Company SOP QMS-RM-001</td><td>Процедура управления рисками</td></tr>
                <tr><td>7</td><td>IFU-CP-01</td><td>Инструкция по применению — Контейнер для очистки</td></tr>
            </table>
            
            <h3>10.2 Управление документом</h3>
            <table class="info-table">
                <tr><td>Название документа</td><td>Отчёт по управлению рисками — {get_field(project.device_name)}</td></tr>
                <tr><td>Номер документа</td><td>{get_field(doc_version.report_number)}</td></tr>
                <tr><td>Редакция</td><td>{get_field(doc_version.version)}</td></tr>
                <tr><td>Статус</td><td>Утверждён</td></tr>
                <tr><td>Дата вступления в силу</td><td>{date_str.replace(' ', '.') if isinstance(date_str, str) and 'не заполнено' not in date_str else date_str}</td></tr>
                <tr><td>Местоположение контролируемой копии</td><td>Репозиторий СМК / Папка: "Управление рисками"</td></tr>
            </table>
        </div>
        

    </body>
    </html>
    """
    return html


def generate_key_performance_characteristics(project):
    """Generate Key performance characteristics section"""
    import html as html_module
    
    key_performance_chars = []
    if getattr(project, 'indications', None):
        key_performance_chars.append(f"Показания: {getattr(project, 'indications', '')}")
    if getattr(project, 'contraindications', None):
        key_performance_chars.append(f"Противопоказания: {getattr(project, 'contraindications', '')}")
    if getattr(project, 'target_group', None):
        key_performance_chars.append(f"Целевая группа: {getattr(project, 'target_group', '')}")
    
    if key_performance_chars:
        html = '<h3>Ключевые эксплуатационные характеристики</h3><p>'
        html += html_module.escape('\n'.join(key_performance_chars))
        html += '</p>'
        return html
    return ''


def generate_disposal_and_warnings(project):
    """Generate Disposal and Warnings sections"""
    import html as html_module
    
    html = ''
    
    if getattr(project, 'disposal', None):
        html += '<h3>Утилизация</h3><p>'
        html += html_module.escape(str(getattr(project, 'disposal', '')))
        html += '</p>'
    
    if getattr(project, 'warnings', None):
        html += '<h3>Предупреждения</h3><p>'
        html += html_module.escape(str(getattr(project, 'warnings', '')))
        html += '</p>'
    
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
            # Table 6.2 - Control measures: initial risk + Контроль риска (меры + верификация). No residual columns.
            all_columns = [
                'table_name', 'hazard_category', 'hazard_name', 'event_sequence',
                'hazardous_situation', 'harm',
                'severity_score', 'probability_score', 'risk_score', 'risk_level_1', 'comment_1',
                'control_measure_1', 'control_measure_2', 'control_measure_3',
                'verification_1', 'verification_2', 'verification_3',
            ]
            col_names = {
                'table_name': 'Этап жизненного цикла',
                'hazard_category': 'Категория опасности',
                'hazard_name': 'Наименование опасности',
                'event_sequence': 'Последовательность событий',
                'hazardous_situation': 'Опасная ситуация',
                'harm': 'Вред',
                'severity_score': 'Тяжесть вреда, балл',
                'probability_score': 'Вероятность причинения вреда, балл',
                'risk_score': 'Риск, балл',
                'risk_level_1': 'Уровень риска (доп./не доп.)',
                'comment_1': 'Комментарий',
                'control_measure_1': 'Безопасность, заложенная в конструкции',
                'control_measure_2': 'Защитная мера/средство',
                'control_measure_3': 'Информация по безопасности/обучению',
                'verification_1': 'Безопасность, заложенная в конструкции',
                'verification_2': 'Защитная мера/средство',
                'verification_3': 'Информация по безопасности',
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

    # For table 6.2 (control measures): render two-level header with "Контроль риска" group
    is_62_table = columns == ['lifecycle_stage', 'hazard', 'control_measures']
    if is_62_table:
        base_cols = ['table_name', 'hazard_category', 'hazard_name', 'event_sequence',
                     'hazardous_situation', 'harm', 'severity_score', 'probability_score',
                     'risk_score', 'risk_level_1', 'comment_1']
        ctrl_cols = ['control_measure_1', 'control_measure_2', 'control_measure_3',
                     'verification_1', 'verification_2', 'verification_3']
        html = '<table><thead>'
        # Row 1: base cols with rowspan=2, then group header
        html += '<tr>'
        for col in base_cols:
            html += f'<th rowspan="2">{col_names.get(col, col)}</th>'
        html += '<th colspan="3">Меры по управлению риском</th>'
        html += '<th colspan="3">Верификация мер по управлению риском</th>'
        html += '</tr>'
        # Row 2: sub-columns under "Контроль риска"
        ctrl_labels = [
            'Безопасность, заложенная в конструкции',
            'Защитная мера/средство',
            'Информация по безопасности/обучению',
            'Безопасность, заложенная в конструкции',
            'Защитная мера/средство',
            'Информация по безопасности',
        ]
        html += '<tr>'
        for label in ctrl_labels:
            html += f'<th>{label}</th>'
        html += '</tr>'
        html += '</thead><tbody>'
        ordered_cols = base_cols + ctrl_cols
        for risk in risks:
            html += '<tr>'
            for col in ordered_cols:
                value = risk.get(col, '')
                if not value or str(value).strip() == '':
                    value = '<span class="empty-field">не заполнено</span>'
                else:
                    if col == 'table_name':
                        value = _format_lifecycle_stage_label(value)
                    value = html_module.escape(str(value))
                html += f'<td>{value}</td>'
            html += '</tr>'
        html += '</tbody></table>'
        return html

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
                if col == 'table_name':
                    value = _format_lifecycle_stage_label(value)
                value = html_module.escape(str(value))
            html += f'<td>{value}</td>'
        html += '</tr>'

    html += '</tbody></table>'
    return html


def generate_residual_risks_table(risks):
    """Generate HTML table for residual risks (table 7.2) using residual fields from ExcelTable."""
    import html as html_module

    if not risks:
        return '<p class="empty-field">Нет данных</p>'

    all_columns = [
        'table_name', 'hazard_category', 'hazard_name', 'event_sequence', 'harm',
        'residual_risk_level', 'residual_probability', 'residual_risk_score', 'risk_level_2',
        'comment_2', 'risk_benefit_analysis', 'new_risks'
    ]

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
        html += f'<th>{col_names[col]}</th>'
    html += '</tr></thead><tbody>'

    for risk in risks:
        html += '<tr>'
        for col in all_columns:
            value = risk.get(col, '')
            if not value or str(value).strip() == '':
                value = '<span class="empty-field">не заполнено</span>'
            else:
                if col == 'table_name':
                    value = _format_lifecycle_stage_label(value)
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
        'admin': 'АДМИНИСТРАТОР',
        'manager': 'МЕНЕДЖЕР',
        'specialist': 'СПЕЦИАЛИСТ ПО ЖИЗНЕННОМУ ЦИКЛУ'
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
    
    ensure_document_access(project, current_user, db)
    
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
