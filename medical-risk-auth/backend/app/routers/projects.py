"""
Projects router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
from pydantic import BaseModel

from ..database import get_db
from ..models.user import User, UserRole
from ..models.project import Project, ProjectMember, ProjectVersion, ProjectStatus, ProjectRole
from ..models.risk_analysis import RiskAnalysis, RiskFactor, RiskManagementTable
from ..schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse,
    ProjectMemberCreate, ProjectMemberResponse, ProjectMemberRoleUpdate,
    ProjectVersionCreate, ProjectVersionResponse
)
from ..routers.auth import get_current_active_user
from ..core.logging import (
    log_project_created, log_project_updated, log_project_deleted,
    log_project_status_changed, log_project_member_added, log_project_member_removed,
    log_project_member_role_changed
)

# Default probability levels (4 levels)
DEFAULT_PROBABILITY_LEVELS = [
    {
        "level": 1,
        "name": "Маловероятный",
        "description": "Маловероятно произойти (только в исключительном случае стечения нескольких редких ошибок и/или обстоятельств)"
    },
    {
        "level": 2,
        "name": "Отдаленный",
        "description": "Может произойти, но не часто (возможно для немногих устройств, один или два раза за время эксплуатации)"
    },
    {
        "level": 3,
        "name": "Эпизодический",
        "description": "Вероятно произойти (возможно для многих устройств один или два раза за время эксплуатации, или для отдельных устройств несколько раз за время эксплуатации)"
    },
    {
        "level": 4,
        "name": "Частый",
        "description": "Происходит часто (происходит для многих или всех устройств несколько раз за время эксплуатации)"
    }
]

def _safe_json_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def _extract_hazard_category_text(risk: RiskFactor) -> str:
    hazard_name = risk.hazard_name or ""
    if hazard_name.startswith("[") and "]" in hazard_name:
        return hazard_name.split("]", 1)[0].lstrip("[")
    if risk.hazard_category is None:
        return ""
    return risk.hazard_category.value if hasattr(risk.hazard_category, "value") else str(risk.hazard_category)


def _calculate_coverage_progress(db: Session, project: Project) -> float:
    # 'other' is a UI flag meaning "custom stages exist" — exclude it, use actual custom stage names
    lifecycle_stages = [s for s in _safe_json_list(project.lifecycle_stages) if s not in ('other', 'Другие')] + _safe_json_list(project.custom_lifecycle_stages)
    
    # Calculate active hazard categories from hazard_questions
    hazard_categories = _calculate_active_hazard_categories_from_questions(project.hazard_questions)

    if not lifecycle_stages or not hazard_categories:
        return 0.0

    total_required = len(lifecycle_stages) * len(hazard_categories)
    if total_required == 0:
        return 0.0

    analysis = db.query(RiskAnalysis).filter(
        RiskAnalysis.project_id == project.id
    ).order_by(RiskAnalysis.created_at.desc()).first()

    if not analysis:
        return 0.0

    covered = set()
    lifecycle_set = set(lifecycle_stages)
    hazard_set = set(hazard_categories)

    for risk in analysis.risk_factors:
        risk_status = "new"

        if risk.lifecycle_stage:
            table = db.query(RiskManagementTable).filter(
                RiskManagementTable.project_id == project.id,
                RiskManagementTable.sheet_id == risk.lifecycle_stage
            ).first()

            if table and table.rows:
                factor_id_str = str(risk.id)
                matched_row = None

                for row in table.rows:
                    row_data = row.data or {}
                    row_risk_id = row_data.get("risk_id", "")

                    if row_risk_id == factor_id_str:
                        matched_row = row
                        break

                    if not matched_row:
                        clean_factor_name = risk.hazard_name
                        if risk.hazard_name and "[" in risk.hazard_name:
                            parts = risk.hazard_name.split("]", 1)
                            if len(parts) > 1:
                                clean_factor_name = parts[1].strip()

                        row_hazard_name = row_data.get("hazard_name", "")
                        row_situation = row_data.get("hazardous_situation", "")
                        row_harm = row_data.get("harm", "")

                        if (
                            row_situation == risk.hazardous_situation
                            and row_harm == risk.harm
                            and (row_hazard_name == clean_factor_name or row_hazard_name == risk.hazard_name)
                        ):
                            matched_row = row

                if matched_row:
                    matched_data = matched_row.data or {}
                    risk_status = matched_data.get("risk_status", "new")

        if risk_status not in ["closed", "fully_closed"]:
            continue

        stage = risk.lifecycle_stage
        hazard = _extract_hazard_category_text(risk)
        if stage in lifecycle_set and hazard in hazard_set:
            covered.add(f"{stage}|||{hazard}")

    coverage_percentage = round((len(covered) / total_required) * 100)
    return float(coverage_percentage)


def _calculate_active_hazard_categories_from_questions(hazard_questions_json):
    """
    Calculate active hazard categories based on hazard questions.
    This mirrors the frontend logic for consistency.
    """
    if not hazard_questions_json:
        return []
    
    try:
        hazard_questions = json.loads(hazard_questions_json) if isinstance(hazard_questions_json, str) else hazard_questions_json
    except (json.JSONDecodeError, TypeError):
        return []

    # Always active categories
    active_categories = {
        'Опасности, связанные с удобством использования',
        'Опасности, связанные с надежностью, отказом конструкции или функций изделия',
        'Опасности клинического применения',
        'Другие'
    }
    
    # Mapping questions to categories
    question_to_category_map = {
        # Биосовместимость
        'bodyContact': 'Опасности, связанные с биосовместимостью',
        'materialContact': 'Опасности, связанные с биосовместимостью',
        'implantableDevice': 'Опасности, связанные с биосовместимостью',
        'substanceRelease': 'Опасности, связанные с биосовместимостью',
        'sensitization': 'Опасности, связанные с биосовместимостью',
        'implantable': 'Опасности, связанные с биосовместимостью',
        
        # Безопасность данных и систем
        'containsSoftware': 'Опасности, связанные с безопасностью данных и систем',
        'dataExchange': 'Опасности, связанные с безопасностью данных и систем',
        'wireless': 'Опасности, связанные с безопасностью данных и систем',
        'personalData': 'Опасности, связанные с безопасностью данных и систем',
        'userInterface': 'Опасности, связанные с безопасностью данных и систем',
        'software': 'Опасности, связанные с безопасностью данных и систем',
        
        # Электричество
        'activeDevice': 'Опасности, связанные с электричеством',
        'powerConnection': 'Опасности, связанные с электричеством',
        'electricalContacts': 'Опасности, связанные с электричеством',
        'active': 'Опасности, связанные с электричеством',
        
        # Движущиеся части
        'movingElements': 'Опасности, связанные с движущимися частями',
        'movingRisk': 'Опасности, связанные с движущимися частями',
        
        # Излучение
        'emitsEnergy': 'Опасности, связанные с излучением',
        'opticalSystems': 'Опасности, связанные с излучением',
        
        # Удобство использования (всегда активна)
        'specialTraining': 'Опасности, связанные с удобством использования',
        'specialNeeds': 'Опасности, связанные с удобством использования',
        'interfaceError': 'Опасности, связанные с удобством использования',
        'alarms': 'Опасности, связанные с удобством использования',
        
        # Микробиологические факторы
        'isSterile': 'Опасности, связанные с микробиологическими факторами',
        'reusable': 'Опасности, связанные с микробиологическими факторами',
        'biologicalContact': 'Опасности, связанные с микробиологическими факторами',
        'sterile': 'Опасности, связанные с микробиологическими факторами',
        'disposable': 'Опасности, связанные с микробиологическими факторами',
        
        # Химические вещества
        'chemicalSubstances': 'Опасности, связанные с химическими веществами',
        'chemicalRelease': 'Опасности, связанные с химическими веществами',
        'chemicalSterilization': 'Опасности, связанные с химическими веществами',
        
        # Ткани животного происхождения
        'animalMaterials': 'Опасности, связанные с тканями животного происхождения',
        
        # Наноматериалы
        'nanomaterials': 'Опасности, связанные с наноматериалами',
        
        # Фармацевтические субстанции
        'pharmaceutical': 'Опасности, связанные с фармацевтическими субстанциями',
        
        # Воздействие окружающей среды
        'environmentalSensitivity': 'Опасности, связанные с воздействием окружающей среды',
        'environmentalImpact': 'Опасности, связанные с воздействием окружающей среды',
        
        # Механические факторы
        'mechanicalLoad': 'Опасности, связанные с механическими факторами, физические',
        'destructionRisk': 'Опасности, связанные с механическими факторами, физические',
        
        # Термические воздействия
        'heating': 'Опасности, связанные с термическими воздействиями',
        'surfaceContact': 'Опасности, связанные с термическими воздействиями',
        
        # Клиническое применение (всегда активна)
        'clinicalUse': 'Опасности клинического применения',
        'clinicalError': 'Опасности клинического применения'
    }
    
    # Check each question and add corresponding categories
    for question, is_checked in hazard_questions.items():
        if is_checked and question in question_to_category_map:
            category = question_to_category_map[question]
            active_categories.add(category)
    
    return list(active_categories)

# Lifecycle stage mapping for converting between keys and display names
LIFECYCLE_STAGE_MAPPING = {
    'design_development': 'Проектирование и разработку',
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

# Reverse mapping for converting display names back to keys
REVERSE_LIFECYCLE_STAGE_MAPPING = {v: k for k, v in LIFECYCLE_STAGE_MAPPING.items()}
# Backward-compatible aliases for legacy stored labels
REVERSE_LIFECYCLE_STAGE_MAPPING['Проектирование и разработка'] = 'design_development'

def _normalize_lifecycle_stages_for_frontend(stages):
    """
    Convert stored display names back to keys for frontend form compatibility.
    Handles both single stage and array formats.
    """
    if not stages:
        return []
    
    # Handle array format
    if isinstance(stages, list):
        result = []
        for stage in stages:
            if isinstance(stage, str):
                # Try to convert display name to key
                key = REVERSE_LIFECYCLE_STAGE_MAPPING.get(stage.strip())
                if key:
                    result.append(key)
                else:
                    # If not found in mapping, keep as is (for custom stages)
                    result.append(stage.strip())
        return result
    
    # Handle string format (legacy)
    if isinstance(stages, str):
        try:
            parsed = json.loads(stages)
            if isinstance(parsed, list):
                return _normalize_lifecycle_stages_for_frontend(parsed)
        except (json.JSONDecodeError, TypeError):
            pass
        # For single string, try to convert if it's a display name
        key = REVERSE_LIFECYCLE_STAGE_MAPPING.get(stages.strip())
        if key:
            return [key]
        else:
            return [stages.strip()]
    
    return []

def _normalize_lifecycle_stages_for_backend(stages):
    """
    Convert frontend keys to display names for backend storage.
    """
    if not stages:
        return []
    
    result = []
    for stage in stages:
        if isinstance(stage, str):
            # Convert key to display name if it exists in mapping
            display_name = LIFECYCLE_STAGE_MAPPING.get(stage.strip())
            if display_name:
                result.append(display_name)
            else:
                # If not found in mapping, keep as is (for custom stages)
                result.append(stage.strip())
    
    return result


def _normalize_lifecycle_stage_keys(stages):
    """
    Normalize lifecycle stages to canonical key format for DB storage.
    Accepts both keys and legacy display names.
    """
    if not stages:
        return []

    normalized = []
    for stage in stages:
        if not isinstance(stage, str):
            continue
        value = stage.strip()
        if not value:
            continue
        key = REVERSE_LIFECYCLE_STAGE_MAPPING.get(value, value)
        if key not in normalized:
            normalized.append(key)
    return normalized

router = APIRouter()
MAX_MEMBERS_PER_NON_ADMIN_ROLE = 5


class ProductManagerAssignRequest(BaseModel):
    user_id: int


def get_project(db: Session, project_id: int) -> Project:
    """Get project by ID"""
    return db.query(Project).filter(Project.id == project_id).first()


def _ensure_role_capacity(db: Session, project_id: int, role: ProjectRole, exclude_user_id: int = None):
    """Enforce per-project cap for non-admin roles."""
    if role == ProjectRole.ADMIN:
        return
    query = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.role == role
    )
    if exclude_user_id is not None:
        query = query.filter(ProjectMember.user_id != exclude_user_id)
    current_count = query.count()
    if current_count >= MAX_MEMBERS_PER_NON_ADMIN_ROLE:
        raise HTTPException(
            status_code=400,
            detail=f"Role '{role.value}' already has {MAX_MEMBERS_PER_NON_ADMIN_ROLE} members in this project"
        )


def _normalize_specialist_lifecycle_stages(single_stage, multiple_stages) -> List[str]:
    """Normalize specialist lifecycle assignment from legacy/single and new/multi payloads."""
    normalized: List[str] = []
    candidates = []
    if single_stage:
        candidates.append(single_stage)
    if isinstance(multiple_stages, list):
        candidates.extend(multiple_stages)

    for stage in candidates:
        stage_value = str(stage or "").strip()
        if stage_value and stage_value not in normalized:
            normalized.append(stage_value)

    return normalized


def _decode_assigned_lifecycle_stages(raw_value) -> List[str]:
    """Decode assigned lifecycle stages from DB string (legacy plain string or JSON array)."""
    if not raw_value:
        return []

    if isinstance(raw_value, list):
        return _normalize_specialist_lifecycle_stages(None, raw_value)

    if isinstance(raw_value, str):
        value = raw_value.strip()
        if not value:
            return []
        if value.startswith("["):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return _normalize_specialist_lifecycle_stages(None, parsed)
            except json.JSONDecodeError:
                pass
        return [value]

    return []


def _encode_assigned_lifecycle_stages(stages: List[str]):
    if not stages:
        return None
    return json.dumps(stages, ensure_ascii=False)


def _get_member_assigned_lifecycle_stages(member: ProjectMember) -> List[str]:
    return _decode_assigned_lifecycle_stages(member.assigned_lifecycle_stage)


def _get_member_primary_lifecycle_stage(member: ProjectMember):
    stages = _get_member_assigned_lifecycle_stages(member)
    return stages[0] if stages else None


def _validate_specialist_stage_capacity(
    db: Session,
    project_id: int,
    requested_stages: List[str],
    exclude_user_id: int = None,
):
    """Validate per-stage specialist capacity for all requested stages."""
    if not requested_stages:
        return

    specialist_members = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.role == ProjectRole.SPECIALIST,
    ).all()

    stage_counts = {}
    for specialist in specialist_members:
        if exclude_user_id is not None and specialist.user_id == exclude_user_id:
            continue
        for stage in _get_member_assigned_lifecycle_stages(specialist):
            stage_counts[stage] = stage_counts.get(stage, 0) + 1

    for stage in requested_stages:
        if stage_counts.get(stage, 0) >= MAX_MEMBERS_PER_NON_ADMIN_ROLE:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Specialist limit for lifecycle stage '{stage}' reached "
                    f"(max {MAX_MEMBERS_PER_NON_ADMIN_ROLE})"
                ),
            )


def check_project_access(project: Project, user: User, db: Session):
    """Check if user has access to project"""
    # System admin can access all projects
    if user.role == UserRole.SYS_ADMIN:
        return True

    # Project owner can access their project
    if project.owner_id == user.id:
        return True

    # Check if user is a member of the project
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()

    return member is not None


def check_user_permission(user: User, permission_key: str, project_id: int = None, db: Session = None):
    """Check if user has a specific permission"""
    # System admin has all permissions
    if user.role == UserRole.SYS_ADMIN:
        return True

    if not db or not project_id:
        return False

    # Get user's role in the project
    project_role = None
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        return False

    # Check if user is project owner (always admin)
    if project.owner_id == user.id:
        project_role = "admin"
    else:
        # Check if user is a project member
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id
        ).first()

        if member:
            project_role = member.role.value

    # Get permissions for the role
    if project_role:
        # Project admin is the project creator and cannot perform product-manager workflow actions.
        if project_role == "admin" and permission_key in {
            "edit_project",
            "assign_lifecycle_access",
            "create_risks",
            "edit_risks",
            "edit_risk_tables",
            "assess_severity",
            "assess_probability",
            "create_report",
        }:
            return False

        from ..models.project import RolePermission
        role_permissions = db.query(RolePermission).filter(
            RolePermission.role_name == project_role
        ).all()
        permission_keys = [rp.permission_key for rp in role_permissions]
        return permission_key in permission_keys

    return False


def get_user_project_role(project: Project, user: User, db: Session):
    """Resolve user's effective role inside a project."""
    if user.role == UserRole.SYS_ADMIN:
        return "sys_admin"
    if project.owner_id == user.id:
        return "admin"
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user.id
    ).first()
    return member.role.value if member else None


def get_project_completion_issues(project: Project):
    """Return list of required fields that are still empty for role management."""
    required_fields = {
        "name": "Название проекта",
        "description": "Описание проекта",
        "device_name": "Название устройства",
        "device_model": "Модель устройства",
        "device_purpose": "Назначение устройства",
        "device_description": "Описание устройства",
        "device_classification": "Классификация устройства",
        "operating_environment": "Условия эксплуатации",
        "technical_specs": "Технические характеристики",
        "regulatory_requirements": "Нормативные требования",
        "standards": "Применимые стандарты",
    }
    missing = []
    for field, label in required_fields.items():
        value = getattr(project, field, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(label)

    lifecycle_stages = [s for s in _safe_json_list(project.lifecycle_stages) if s not in ('other', 'Другие')] + _safe_json_list(project.custom_lifecycle_stages)
    if len(lifecycle_stages) == 0:
        missing.append("Этапы жизненного цикла")

    return missing


def ensure_project_ready_for_role_management(project: Project):
    """Block member/role management until required project fields are filled."""
    missing = get_project_completion_issues(project)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Перед управлением ролями заполните обязательные поля проекта: {', '.join(missing)}"
        )


def check_project_edit_permission(project: Project, user: User, db: Session = None):
    """Check if user can edit project data (product manager role)"""
    return check_user_permission(user, "edit_project", project.id, db)


def check_project_delete_permission(project: Project, user: User, db: Session = None):
    """Check if user can delete project (only admin)"""
    return check_user_permission(user, "delete_project", project.id, db)


def check_project_member_management_permission(project: Project, user: User, db: Session = None):
    """Check if user can manage project members (admin, manager)"""
    return check_user_permission(user, "manage_members", project.id, db)


@router.get("/", response_model=List[ProjectListResponse])
async def read_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all projects accessible to the user"""
    if current_user.role == UserRole.SYS_ADMIN:
        # System admin can see all projects
        # Use explicit column selection to avoid loading all fields
        projects = db.query(Project).offset(skip).limit(limit).all()
    else:
        # Regular users can see projects they own or are members of
        # Use explicit column selection to avoid loading all fields
        projects = db.query(Project).join(ProjectMember, Project.id == ProjectMember.project_id, isouter=True).filter(
            (Project.owner_id == current_user.id) | (ProjectMember.user_id == current_user.id)
        ).distinct().offset(skip).limit(limit).all()

    # Add member count and user role for each project
    result = []
    for project in projects:
        member_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()

        # Determine user's role in this project
        user_role = None
        if current_user.role == UserRole.SYS_ADMIN:
            # Sys admin is always admin in every project
            user_role = "admin"
        else:
            # Check if user is owner (project creator = admin)
            if project.owner_id == current_user.id:
                user_role = "admin"
            else:
                # Check if user is member and get their role
                member = db.query(ProjectMember).filter(
                    ProjectMember.project_id == project.id,
                    ProjectMember.user_id == current_user.id
                ).first()
                if member:
                    user_role = member.role.value

        project_data = ProjectListResponse(
            id=project.id,
            name=project.name,
            status=project.status,
            progress_percentage=_calculate_coverage_progress(db, project),
            device_name=project.device_name,
            owner_id=project.owner_id,
            created_at=project.created_at,
            member_count=member_count,
            user_role=user_role
        )
        result.append(project_data)

    return result


@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project (all users can create projects)"""
    # All users can create projects
    
    # Calculate active hazard categories from hazard questions if not provided
    active_hazard_categories = project.active_hazard_categories
    if not active_hazard_categories and project.hazard_questions:
        active_hazard_categories = _calculate_active_hazard_categories_from_questions(project.hazard_questions)
        print(f"[DEBUG] Project creation: Calculated active_hazard_categories: {active_hazard_categories}")
    
    db_project = Project(
        name=project.name,
        description=project.description,
        device_name=project.device_name or "",
        device_model=project.device_model,
        device_purpose=project.device_purpose,
        device_description=project.device_description,
        device_classification=project.device_classification,
        intended_use=project.intended_use,
        user_profile=project.user_profile,
        operating_environment=project.operating_environment,
        technical_specs=project.technical_specs,
        regulatory_requirements=project.regulatory_requirements,
        standards=project.standards,
        # New fields for 14971 standard requirements
        indications=project.indications,
        contraindications=project.contraindications,
        target_group=project.target_group,
        warnings=project.warnings,
        disposal=project.disposal,
        contact_type=project.contact_type,
        duration=project.duration,
        invasiveness=project.invasiveness,
        energy_source=project.energy_source,
        # New project is always created as a blank draft awaiting product manager assignment.
        status=ProjectStatus.DRAFT,
        owner_id=current_user.id,
        lifecycle_stages=json.dumps(_normalize_lifecycle_stage_keys(project.lifecycle_stages)) if project.lifecycle_stages else None,
        custom_lifecycle_stages=json.dumps([str(s).strip() for s in (project.custom_lifecycle_stages or []) if str(s).strip()]) if project.custom_lifecycle_stages else None,
        hazard_questions=json.dumps(project.hazard_questions) if project.hazard_questions else None,
        custom_hazard=project.custom_hazard,
        hazard_checklist_answers=json.dumps(project.hazard_checklist_answers) if project.hazard_checklist_answers else None,
        active_hazard_categories=json.dumps(active_hazard_categories) if active_hazard_categories else None,
        severity_levels=json.dumps(project.severity_levels) if project.severity_levels else None,
        probability_levels=json.dumps(project.probability_levels or DEFAULT_PROBABILITY_LEVELS),
        risk_threshold=project.risk_threshold if project.risk_threshold else 10
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    # Create initial version
    initial_version = ProjectVersion(
        project_id=db_project.id,
        version="1.0",
        description="Initial version",
        is_current=True
    )
    db.add(initial_version)
    db.commit()
    
    # Log project creation
    project_data = {
        "name": db_project.name,
        "description": db_project.description,
        "device_name": db_project.device_name,
        "status": db_project.status.value,
        "owner_id": db_project.owner_id
    }
    await log_project_created(
        db=db,
        user=current_user,
        project_id=db_project.id,
        project_name=db_project.name,
        project_data=project_data,
        request=request
    )

    # Return properly formatted response like read_project and update_project
    # Get project members
    owner = db.query(User).filter(User.id == db_project.owner_id).first()
    owner_member = ProjectMemberResponse(
        id=0,  # Special ID for owner
        project_id=db_project.id,
        user_id=owner.id,
        role="admin",  # Project owner is admin
        joined_at=db_project.created_at,
        user_email=owner.email,
        user_first_name=owner.first_name,
        user_last_name=owner.last_name
    )

    # Get project members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == db_project.id).all()
    member_responses = []

    # Add owner to members list
    member_responses.append(owner_member)

    # For sys admin: add them as admin if they're not the owner
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        sysadmin_member = ProjectMemberResponse(
            id=-1,  # Special ID for sys admin
            project_id=db_project.id,
            user_id=current_user.id,
            role="admin",  # Sys admin is always admin in any project
            joined_at=db_project.created_at,
            user_email=current_user.email,
            user_first_name=current_user.first_name,
            user_last_name=current_user.last_name
        )
        member_responses.append(sysadmin_member)

    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue

        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(member),
                assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(member),
                joined_at=member.joined_at,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name
            ))

    # Deserialize JSON fields for response
    def safe_json_load(data):
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    lifecycle_stages_data = safe_json_load(db_project.lifecycle_stages)
    custom_lifecycle_stages_data = safe_json_load(db_project.custom_lifecycle_stages)
    hazard_questions_data = safe_json_load(db_project.hazard_questions)
    severity_levels_data = safe_json_load(db_project.severity_levels)
    probability_levels_data = safe_json_load(db_project.probability_levels)
    
    # Debug logging for active_hazard_categories
    print(f"[DEBUG] Project {db_project.id} active_hazard_categories raw: {db_project.active_hazard_categories}")
    print(f"[DEBUG] Project {db_project.id} active_hazard_categories type: {type(db_project.active_hazard_categories)}")
    
    # Calculate active hazard categories from questions if not stored
    active_hazard_categories_data = None
    if db_project.active_hazard_categories:
        try:
            active_hazard_categories_data = safe_json_load(db_project.active_hazard_categories)
            print(f"[DEBUG] Project {db_project.id} parsed active_hazard_categories: {active_hazard_categories_data}")
        except Exception as e:
            print(f"[DEBUG] Failed to parse active_hazard_categories: {e}")
            # Fallback to calculating from questions
            active_hazard_categories_data = _calculate_active_hazard_categories_from_questions(db_project.hazard_questions)
    else:
        # Calculate from questions if not stored
        active_hazard_categories_data = _calculate_active_hazard_categories_from_questions(db_project.hazard_questions)
        print(f"[DEBUG] Project {db_project.id} calculated active_hazard_categories from questions: {active_hazard_categories_data}")

    # Create response manually to avoid ORM serialization issues
    response_data = ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        status=db_project.status,
        progress_percentage=_calculate_coverage_progress(db, db_project),
        device_name=db_project.device_name,
        device_model=db_project.device_model,
        device_purpose=db_project.device_purpose,
        device_description=db_project.device_description,
        device_classification=db_project.device_classification,
        intended_use=db_project.intended_use,
        user_profile=db_project.user_profile,
        operating_environment=db_project.operating_environment,
        manufacturer=getattr(db_project, 'manufacturer', None),
        manufacturer_address=getattr(db_project, 'manufacturer_address', None),
        technical_specs=db_project.technical_specs,
        regulatory_requirements=db_project.regulatory_requirements,
        standards=db_project.standards,
        contact_type=db_project.contact_type,
        duration=db_project.duration,
        invasiveness=db_project.invasiveness,
        energy_source=db_project.energy_source,
        indications=db_project.indications,
        contraindications=db_project.contraindications,
        target_group=db_project.target_group,
        warnings=db_project.warnings,
        disposal=db_project.disposal,
        lifecycle_stages=lifecycle_stages_data,
        custom_lifecycle_stages=custom_lifecycle_stages_data,
        hazard_questions=hazard_questions_data,
        custom_hazard=db_project.custom_hazard,
        active_hazard_categories=active_hazard_categories_data,
        severity_levels=severity_levels_data,
        probability_levels=probability_levels_data,
        risk_threshold=db_project.risk_threshold if db_project.risk_threshold else 10,
        owner_id=db_project.owner_id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        members=member_responses,
        versions=[]  # We'll add versions if needed later
    )

    return response_data


@router.get("/{project_id}", response_model=ProjectResponse)
async def read_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get project by ID"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )
    
    # Get project members
    owner = db.query(User).filter(User.id == db_project.owner_id).first()
    owner_member = ProjectMemberResponse(
        id=0,  # Special ID for owner
        project_id=project_id,
        user_id=owner.id,
        role="admin",  # Project owner is admin
        joined_at=db_project.created_at,
        user_email=owner.email,
        user_first_name=owner.first_name,
        user_last_name=owner.last_name
    )
    
    # Get project members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    member_responses = []
    
    # Add owner to members list
    member_responses.append(owner_member)
    
    # For sys admin: add them as admin if they're not the owner
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        sysadmin_member = ProjectMemberResponse(
            id=-1,  # Special ID for sys admin
            project_id=project_id,
            user_id=current_user.id,
            role="admin",  # Sys admin is always admin in any project
            joined_at=db_project.created_at,
            user_email=current_user.email,
            user_first_name=current_user.first_name,
            user_last_name=current_user.last_name
        )
        member_responses.append(sysadmin_member)
    
    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue
            
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(member),
                assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(member),
                joined_at=member.joined_at,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name
            ))
    
    # Deserialize JSON fields
    lifecycle_stages_data = _normalize_lifecycle_stages_for_frontend(db_project.lifecycle_stages)
    custom_lifecycle_stages_data = json.loads(db_project.custom_lifecycle_stages) if db_project.custom_lifecycle_stages else None
    hazard_questions_data = json.loads(db_project.hazard_questions) if db_project.hazard_questions else None
    severity_levels_data = json.loads(db_project.severity_levels) if db_project.severity_levels else None
    probability_levels_data = json.loads(db_project.probability_levels) if db_project.probability_levels else None

    # Load active hazard categories from stored data
    active_hazard_categories_data = None
    print(f"[DEBUG] Project {db_project.id} raw hazard_questions: {db_project.hazard_questions}")
    print(f"[DEBUG] Project {db_project.id} raw active_hazard_categories: {db_project.active_hazard_categories}")
    
    if db_project.active_hazard_categories:
        try:
            active_hazard_categories_data = json.loads(db_project.active_hazard_categories)
            print(f"[DEBUG] Project {db_project.id} parsed active_hazard_categories: {active_hazard_categories_data}")
        except Exception as e:
            print(f"[DEBUG] Failed to parse active_hazard_categories: {e}")
            # Fallback to calculating from questions (for backward compatibility with old projects)
            active_hazard_categories_data = _calculate_active_hazard_categories_from_questions(db_project.hazard_questions)
            print(f"[DEBUG] Project {db_project.id} fallback calculated active_hazard_categories: {active_hazard_categories_data}")
    else:
        # Calculate from questions if not stored (for backward compatibility with old projects)
        active_hazard_categories_data = _calculate_active_hazard_categories_from_questions(db_project.hazard_questions)
        print(f"[DEBUG] Project {db_project.id} calculated active_hazard_categories from questions: {active_hazard_categories_data}")

    # Create response manually to avoid ORM serialization issues
    response_data = ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        status=db_project.status,
        progress_percentage=_calculate_coverage_progress(db, db_project),
        device_name=db_project.device_name,
        device_model=db_project.device_model,
        device_purpose=db_project.device_purpose,
        device_description=db_project.device_description,
        device_classification=db_project.device_classification,
        intended_use=db_project.intended_use,
        user_profile=db_project.user_profile,
        operating_environment=db_project.operating_environment,
        manufacturer=getattr(db_project, 'manufacturer', None),
        manufacturer_address=getattr(db_project, 'manufacturer_address', None),
        technical_specs=db_project.technical_specs,
        regulatory_requirements=db_project.regulatory_requirements,
        standards=db_project.standards,
        contact_type=db_project.contact_type,
        duration=db_project.duration,
        invasiveness=db_project.invasiveness,
        energy_source=db_project.energy_source,
        indications=db_project.indications,
        contraindications=db_project.contraindications,
        target_group=db_project.target_group,
        warnings=db_project.warnings,
        disposal=db_project.disposal,
        lifecycle_stages=lifecycle_stages_data,
        custom_lifecycle_stages=custom_lifecycle_stages_data,
        hazard_questions=hazard_questions_data,
        custom_hazard=db_project.custom_hazard,
        active_hazard_categories=active_hazard_categories_data,
        severity_levels=severity_levels_data,
        probability_levels=probability_levels_data,
        risk_threshold=db_project.risk_threshold if db_project.risk_threshold else 10,
        owner_id=db_project.owner_id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        members=member_responses,
        versions=[]  # We'll add versions if needed later
    )
    
    return response_data


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update project information"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit this project"
        )
    
    # Store old values for logging
    old_values = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "device_model": db_project.device_model
    }
    
    old_status = db_project.status
    
    # Update fields if provided
    update_data = project_update.dict(exclude_unset=True)
    # Handle JSON serialization for specific fields
    if 'lifecycle_stages' in update_data:
        update_data['lifecycle_stages'] = json.dumps(
            _normalize_lifecycle_stage_keys(update_data['lifecycle_stages'])
        ) if update_data['lifecycle_stages'] else None
    if 'custom_lifecycle_stages' in update_data:
        update_data['custom_lifecycle_stages'] = json.dumps(
            [str(s).strip() for s in (update_data['custom_lifecycle_stages'] or []) if str(s).strip()]
        ) if update_data['custom_lifecycle_stages'] else None
    if 'hazard_questions' in update_data:
        update_data['hazard_questions'] = json.dumps(update_data['hazard_questions']) if update_data['hazard_questions'] else None
    if 'hazard_checklist_answers' in update_data:
        update_data['hazard_checklist_answers'] = json.dumps(update_data['hazard_checklist_answers']) if update_data['hazard_checklist_answers'] else None
    if 'active_hazard_categories' in update_data:
        update_data['active_hazard_categories'] = json.dumps(update_data['active_hazard_categories']) if update_data['active_hazard_categories'] else None
    if 'severity_levels' in update_data:
        update_data['severity_levels'] = json.dumps(update_data['severity_levels']) if update_data['severity_levels'] else None
    if 'probability_levels' in update_data:
        update_data['probability_levels'] = json.dumps(update_data['probability_levels']) if update_data['probability_levels'] else None
    
    # Handle new technical specification fields for 14971 standard
    # These fields are simple text fields, no JSON serialization needed
    for field in ['indications', 'contraindications', 'target_group', 'warnings', 'disposal']:
        if field in update_data:
            # The field is already in the correct format (string), just ensure it's properly handled
            setattr(db_project, field, update_data[field])
            # Remove from update_data to avoid double assignment below
            del update_data[field]

    # Calculate active hazard categories from hazard questions if not provided in update
    if 'active_hazard_categories' not in update_data and 'hazard_questions' in update_data:
        calculated_categories = _calculate_active_hazard_categories_from_questions(update_data['hazard_questions'])
        print(f"[DEBUG] Project update: Calculated active_hazard_categories from updated hazard_questions: {calculated_categories}")
        update_data['active_hazard_categories'] = json.dumps(calculated_categories) if calculated_categories else None
    elif 'hazard_questions' in update_data and 'active_hazard_categories' in update_data:
        # If both are provided, ensure active_hazard_categories is properly serialized
        if update_data['active_hazard_categories']:
            update_data['active_hazard_categories'] = json.dumps(update_data['active_hazard_categories'])
        else:
            # If active_hazard_categories is empty but hazard_questions exist, recalculate
            calculated_categories = _calculate_active_hazard_categories_from_questions(update_data['hazard_questions'])
            print(f"[DEBUG] Project update: Recalculated active_hazard_categories: {calculated_categories}")
            update_data['active_hazard_categories'] = json.dumps(calculated_categories) if calculated_categories else None

    for field, value in update_data.items():
        setattr(db_project, field, value)

    # Full edit is considered complete-save; enforce required fields.
    ensure_project_ready_for_role_management(db_project)

    db.commit()
    db.refresh(db_project)
    
    # Store new values for logging
    new_values = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "device_model": db_project.device_model
    }
    
    # Log project update
    await log_project_updated(
        db=db,
        user=current_user,
        project_id=db_project.id,
        project_name=db_project.name,
        old_data=old_values,
        new_data=new_values,
        request=request
    )
    
    # Log status change separately if status was changed
    if old_status != db_project.status:
        await log_project_status_changed(
            db=db,
            user=current_user,
            project_id=db_project.id,
            project_name=db_project.name,
            old_status=old_status.value,
            new_status=db_project.status.value,
            request=request
        )
    
    # Return properly formatted response
    # Get owner information
    owner_member = ProjectMemberResponse(
        id=0,  # Virtual member for owner
        project_id=db_project.id,
        user_id=db_project.owner_id,
        role="admin",  # Project owner is admin
        joined_at=db_project.created_at,
        user_email=db_project.owner.email,
        user_first_name=db_project.owner.first_name,
        user_last_name=db_project.owner.last_name
    )
    
    # Get project members with user information
    members = db.query(ProjectMember).filter(
        ProjectMember.project_id == db_project.id
    ).all()
    
    member_responses = []
    
    # Add owner to response first
    member_responses.append(owner_member)
    
    # For sys admin: add them as admin if they're not the owner AND not already a member
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        # Check if sys admin is already in project members
        is_already_member = any(member.user_id == current_user.id for member in members)
        if not is_already_member:
            sysadmin_member = ProjectMemberResponse(
                id=-1,  # Special ID for sys admin
                project_id=db_project.id,
                user_id=current_user.id,
                role="admin",  # Sys admin is always admin in any project
                joined_at=db_project.created_at,
                user_email=current_user.email,
                user_first_name=current_user.first_name,
                user_last_name=current_user.last_name
            )
            member_responses.append(sysadmin_member)
    
    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue
        member_user = db.query(User).filter(User.id == member.user_id).first()
        if member_user:
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(member),
                assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(member),
                joined_at=member.joined_at,
                user_email=member_user.email,
                user_first_name=member_user.first_name,
                user_last_name=member_user.last_name
            ))
    
    # Deserialize JSON fields for response
    def safe_json_load(data):
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    lifecycle_stages_data = safe_json_load(db_project.lifecycle_stages)
    custom_lifecycle_stages_data = safe_json_load(db_project.custom_lifecycle_stages)
    hazard_questions_data = safe_json_load(db_project.hazard_questions)
    severity_levels_data = safe_json_load(db_project.severity_levels)
    probability_levels_data = safe_json_load(db_project.probability_levels)

    # Calculate active hazard categories from questions if not stored
    active_hazard_categories_data = None
    if db_project.active_hazard_categories:
        try:
            active_hazard_categories_data = safe_json_load(db_project.active_hazard_categories)
            print(f"[DEBUG] Project {db_project.id} parsed active_hazard_categories: {active_hazard_categories_data}")
        except Exception as e:
            print(f"[DEBUG] Failed to parse active_hazard_categories: {e}")
            # Fallback to calculating from questions
            active_hazard_categories_data = _calculate_active_hazard_categories_from_questions(db_project.hazard_questions)
    else:
        # Calculate from questions if not stored
        active_hazard_categories_data = _calculate_active_hazard_categories_from_questions(db_project.hazard_questions)
        print(f"[DEBUG] Project {db_project.id} calculated active_hazard_categories from questions: {active_hazard_categories_data}")

    # Create response data
    response_data = ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        status=db_project.status,
        progress_percentage=_calculate_coverage_progress(db, db_project),
        device_name=db_project.device_name,
        device_model=db_project.device_model,
        device_purpose=db_project.device_purpose,
        device_description=db_project.device_description,
        device_classification=db_project.device_classification,
        intended_use=db_project.intended_use,
        user_profile=db_project.user_profile,
        operating_environment=db_project.operating_environment,
        technical_specs=db_project.technical_specs,
        regulatory_requirements=db_project.regulatory_requirements,
        standards=db_project.standards,
        contact_type=db_project.contact_type,
        duration=db_project.duration,
        invasiveness=db_project.invasiveness,
        energy_source=db_project.energy_source,
        indications=db_project.indications,
        contraindications=db_project.contraindications,
        target_group=db_project.target_group,
        warnings=db_project.warnings,
        disposal=db_project.disposal,
        lifecycle_stages=lifecycle_stages_data,
        custom_lifecycle_stages=custom_lifecycle_stages_data,
        hazard_questions=hazard_questions_data,
        custom_hazard=db_project.custom_hazard,
        active_hazard_categories=active_hazard_categories_data,
        severity_levels=severity_levels_data,
        probability_levels=probability_levels_data,
        risk_threshold=db_project.risk_threshold if db_project.risk_threshold else 10,
        owner_id=db_project.owner_id,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        members=member_responses,
        versions=[]  # We'll add versions if needed later
    )
    
    return response_data


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_delete_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to delete this project"
        )

    # Store project data for logging before deletion
    project_data = {
        "name": db_project.name,
        "description": db_project.description,
        "status": db_project.status.value,
        "device_name": db_project.device_name,
        "owner_id": db_project.owner_id
    }
    project_name = db_project.name

    # Delete related records in correct order to avoid foreign key constraint errors
    try:
        # 1. Delete project members (except owner - they will be handled by project deletion)
        db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()

        # 2. Delete risk analyses and their related risk factors
        from ..models.risk_analysis import RiskAnalysis, RiskFactor
        risk_analyses = db.query(RiskAnalysis).filter(RiskAnalysis.project_id == project_id).all()
        for analysis in risk_analyses:
            # Delete risk factors first
            db.query(RiskFactor).filter(RiskFactor.analysis_id == analysis.id).delete()
            # Then delete the analysis
            db.delete(analysis)

        # 3. Delete risk management tables and their related data
        from ..models.risk_analysis import RiskManagementTable, RiskTableRow, RiskTableColumn
        tables = db.query(RiskManagementTable).filter(RiskManagementTable.project_id == project_id).all()
        for table in tables:
            # Delete rows first
            db.query(RiskTableRow).filter(RiskTableRow.table_id == table.id).delete()
            # Delete columns
            db.query(RiskTableColumn).filter(RiskTableColumn.table_id == table.id).delete()
            # Then delete the table
            db.delete(table)

        # 4. Delete project versions
        db.query(ProjectVersion).filter(ProjectVersion.project_id == project_id).delete()

        # 5. Delete document versions
        from ..models import DocumentVersion
        db.query(DocumentVersion).filter(DocumentVersion.project_id == project_id).delete()

        # 6. Delete changelog entries for this project
        from ..models.changelog import ChangeLog
        db.query(ChangeLog).filter(ChangeLog.project_id == project_id).delete()

        # 7. Delete project invitations (if the table exists).
        # IMPORTANT: in PostgreSQL, executing SQL against a missing table aborts
        # the whole transaction, so we must check existence first.
        from sqlalchemy import text
        invitation_table_exists = db.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema()
                      AND table_name = 'project_invitations'
                )
                """
            )
        ).scalar()
        if invitation_table_exists:
            db.execute(
                text("DELETE FROM project_invitations WHERE project_id = :project_id"),
                {"project_id": project_id},
            )

        # 8. Finally, delete the project itself
        db.delete(db_project)

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting project: {str(e)}"
        )

    # Log project deletion. Logging must not break successful deletion response.
    try:
        await log_project_deleted(
            db=db,
            user=current_user,
            project_id=project_id,
            project_name=project_name,
            project_data=project_data,
            request=request
        )
    except Exception as log_error:
        # The project is already deleted; changelog write can fail due to FK constraints
        # or legacy schema differences. Ignore to keep DELETE idempotent for clients.
        print(f"[!] Warning: failed to log project deletion for project {project_id}: {log_error}")

    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/members", response_model=ProjectMemberResponse)
async def add_project_member(
    project_id: int,
    member: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a member to the project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_member_management_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to manage project members"
        )

    actor_project_role = get_user_project_role(db_project, current_user, db)
    if actor_project_role == "admin" and member.role != ProjectRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project admin can assign only product manager"
        )
    if actor_project_role == "manager" and member.role not in {
        ProjectRole.SPECIALIST,
        ProjectRole.DOCTOR,
        ProjectRole.RISK_ASSESSMENT_TEAM_LEADER,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product manager can assign only doctor, risk team leader, or specialist roles"
        )

    # Admin is allowed to assign PM for bootstrap flow.
    if actor_project_role != "admin":
        ensure_project_ready_for_role_management(db_project)
    
    # Check if user exists
    user = db.query(User).filter(User.id == member.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is already a member
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == member.user_id
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member")

    _ensure_role_capacity(db, project_id, member.role)
    
    specialist_stages: List[str] = []
    # For specialist role, validate lifecycle stage assignment(s)
    if member.role == ProjectRole.SPECIALIST:
        specialist_stages = _normalize_specialist_lifecycle_stages(
            member.assigned_lifecycle_stage,
            member.assigned_lifecycle_stages,
        )
        if not specialist_stages:
            raise HTTPException(status_code=400, detail="Specialist role requires at least one assigned lifecycle stage")

        lifecycle_stages = _safe_json_list(db_project.lifecycle_stages) + _safe_json_list(db_project.custom_lifecycle_stages)
        invalid_stages = [stage for stage in specialist_stages if stage not in lifecycle_stages]
        if invalid_stages:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lifecycle stage for this project: {', '.join(invalid_stages)}"
            )
        _validate_specialist_stage_capacity(db, project_id, specialist_stages)

    db_member = ProjectMember(
        project_id=project_id,
        user_id=member.user_id,
        role=member.role,  # This will be ProjectRole enum
        assigned_lifecycle_stage=(
            _encode_assigned_lifecycle_stages(specialist_stages)
            if member.role == ProjectRole.SPECIALIST
            else None
        )
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    # Log member addition
    await log_project_member_added(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=db_project.name,
        member_id=user.id,
        member_name=f"{user.first_name} {user.last_name}",
        member_email=user.email,
        member_role=db_member.role.value
    )
    
    # Return properly formatted response
    return ProjectMemberResponse(
        id=db_member.id,
        project_id=db_member.project_id,
        user_id=db_member.user_id,
        role=db_member.role.value,  # Convert enum to string
        assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(db_member),
        assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(db_member),
        joined_at=db_member.joined_at,
        user_email=user.email,
        user_first_name=user.first_name,
        user_last_name=user.last_name
    )


@router.post("/{project_id}/product-manager", response_model=ProjectMemberResponse)
async def assign_product_manager(
    project_id: int,
    payload: ProductManagerAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Assign product manager for a project (up to role capacity)."""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_member_management_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to manage project members"
        )

    actor_project_role = get_user_project_role(db_project, current_user, db)
    if actor_project_role == "admin":
        # Project admin is limited to product manager assignment only.
        pass
    if actor_project_role == "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product manager cannot assign or replace product manager"
        )

    if payload.user_id == db_project.owner_id:
        raise HTTPException(status_code=400, detail="Project owner cannot be assigned as product manager")

    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == payload.user_id
    ).first()

    if not target_member:
        _ensure_role_capacity(db, project_id, ProjectRole.MANAGER)
        target_member = ProjectMember(
            project_id=project_id,
            user_id=payload.user_id,
            role=ProjectRole.MANAGER,
            assigned_lifecycle_stage=None
        )
        db.add(target_member)
    else:
        if target_member.role != ProjectRole.MANAGER:
            _ensure_role_capacity(db, project_id, ProjectRole.MANAGER, exclude_user_id=payload.user_id)
        target_member.role = ProjectRole.MANAGER
        target_member.assigned_lifecycle_stage = None

    # After product manager assignment, project moves out of waiting state.
    if db_project.status == ProjectStatus.DRAFT:
        db_project.status = ProjectStatus.IN_PROGRESS

    db.commit()
    db.refresh(target_member)

    return ProjectMemberResponse(
        id=target_member.id,
        project_id=target_member.project_id,
        user_id=target_member.user_id,
        role=target_member.role.value,
        assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(target_member),
        assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(target_member),
        joined_at=target_member.joined_at,
        user_email=target_user.email,
        user_first_name=target_user.first_name,
        user_last_name=target_user.last_name
    )


@router.put("/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
async def update_project_member_role(
    project_id: int,
    user_id: int,
    role_update: ProjectMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a project member role"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_member_management_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to manage project members"
        )

    actor_project_role = get_user_project_role(db_project, current_user, db)
    if actor_project_role == "admin" and role_update.role != ProjectRole.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Project admin can assign only product manager"
        )
    if actor_project_role == "manager" and role_update.role not in {
        ProjectRole.SPECIALIST,
        ProjectRole.DOCTOR,
        ProjectRole.RISK_ASSESSMENT_TEAM_LEADER,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product manager can assign only doctor, risk team leader, or specialist roles"
        )

    ensure_project_ready_for_role_management(db_project)

    # Cannot change project owner role
    if user_id == db_project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot change project owner role")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if actor_project_role == "manager" and member.role not in {
        ProjectRole.SPECIALIST,
        ProjectRole.DOCTOR,
        ProjectRole.RISK_ASSESSMENT_TEAM_LEADER,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product manager can edit only doctor, risk team leader, or specialist roles"
        )

    if member.role != role_update.role:
        _ensure_role_capacity(db, project_id, role_update.role, exclude_user_id=user_id)

    specialist_stages: List[str] = []
    # For specialist role, validate lifecycle stage assignment(s)
    if role_update.role == ProjectRole.SPECIALIST:
        specialist_stages = _normalize_specialist_lifecycle_stages(
            role_update.assigned_lifecycle_stage,
            role_update.assigned_lifecycle_stages,
        )
        if not specialist_stages:
            raise HTTPException(status_code=400, detail="Specialist role requires at least one assigned lifecycle stage")

        lifecycle_stages = _safe_json_list(db_project.lifecycle_stages) + _safe_json_list(db_project.custom_lifecycle_stages)
        invalid_stages = [stage for stage in specialist_stages if stage not in lifecycle_stages]
        if invalid_stages:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid lifecycle stage for this project: {', '.join(invalid_stages)}"
            )
        _validate_specialist_stage_capacity(
            db,
            project_id,
            specialist_stages,
            exclude_user_id=user_id,
        )

    old_role = member.role.value
    member.role = role_update.role
    member.assigned_lifecycle_stage = (
        _encode_assigned_lifecycle_stages(specialist_stages)
        if role_update.role == ProjectRole.SPECIALIST
        else None
    )
    db.commit()
    db.refresh(member)

    member_user = db.query(User).filter(User.id == user_id).first()
    member_name = f"{member_user.first_name} {member_user.last_name}" if member_user else f"User {user_id}"

    await log_project_member_role_changed(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=db_project.name,
        member_id=user_id,
        member_name=member_name,
        old_role=old_role,
        new_role=member.role.value
    )

    return ProjectMemberResponse(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        role=member.role.value,
        assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(member),
        assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(member),
        joined_at=member.joined_at,
        user_email=member_user.email if member_user else "",
        user_first_name=member_user.first_name if member_user else "",
        user_last_name=member_user.last_name if member_user else ""
    )


@router.delete("/{project_id}/members/{user_id}")
async def remove_project_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove a member from the project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_member_management_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to manage project members"
        )

    actor_project_role = get_user_project_role(db_project, current_user, db)
    
    # Cannot remove project owner
    if user_id == db_project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove project owner")
    
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if actor_project_role == "manager" and member.role not in {
        ProjectRole.SPECIALIST,
        ProjectRole.DOCTOR,
        ProjectRole.RISK_ASSESSMENT_TEAM_LEADER,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product manager can remove only doctor, risk team leader, or specialist roles"
        )
    
    # Get member user info for logging
    member_user = db.query(User).filter(User.id == user_id).first()
    member_name = f"{member_user.first_name} {member_user.last_name}" if member_user else f"User {user_id}"
    member_email = member_user.email if member_user else "Unknown"
    member_role = member.role.value
    
    db.delete(member)
    db.commit()
    
    # Log member removal
    await log_project_member_removed(
        db=db,
        user=current_user,
        project_id=project_id,
        project_name=db_project.name,
        member_id=user_id,
        member_name=member_name,
        member_email=member_email,
        member_role=member_role
    )
    
    return {"message": "Member removed successfully"}


@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
async def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all members of a project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )
    
    # Get project owner
    owner = db.query(User).filter(User.id == db_project.owner_id).first()
    owner_member = ProjectMemberResponse(
        id=0,  # Special ID for owner
        project_id=project_id,
        user_id=owner.id,
        role="admin",  # Project owner is always admin
        joined_at=db_project.created_at,
        user_email=owner.email,
        user_first_name=owner.first_name,
        user_last_name=owner.last_name
    )
    
    # Get project members
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    member_responses = []
    
    # Add owner to members list first (always admin)
    member_responses.append(owner_member)
    
    # For sys admin: add them as admin if they're not the owner AND not already a member
    if current_user.role == UserRole.SYS_ADMIN and current_user.id != db_project.owner_id:
        # Check if sys admin is already in project members
        is_already_member = any(member.user_id == current_user.id for member in members)
        if not is_already_member:
            sysadmin_member = ProjectMemberResponse(
                id=-1,  # Special ID for sys admin
                project_id=project_id,
                user_id=current_user.id,
                role="admin",  # Sys admin is always admin in any project
                joined_at=db_project.created_at,
                user_email=current_user.email,
                user_first_name=current_user.first_name,
                user_last_name=current_user.last_name
            )
            member_responses.append(sysadmin_member)
    
    # Add actual project members (excluding owner to avoid duplication)
    for member in members:
        # Skip if this member is the owner (already added above)
        if member.user_id == db_project.owner_id:
            continue
            
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:  # Show all project members
            member_responses.append(ProjectMemberResponse(
                id=member.id,
                project_id=member.project_id,
                user_id=member.user_id,
                role=member.role.value,  # Convert enum to string
                assigned_lifecycle_stage=_get_member_primary_lifecycle_stage(member),
                assigned_lifecycle_stages=_get_member_assigned_lifecycle_stages(member),
                joined_at=member.joined_at,
                user_email=user.email,
                user_first_name=user.first_name,
                user_last_name=user.last_name
            ))
    
    # Return all members (owner already added first)
    return member_responses


@router.post("/{project_id}/versions", response_model=ProjectVersionResponse)
async def create_project_version(
    project_id: int,
    version: ProjectVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new project version"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_edit_permission(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to edit this project"
        )

    # Check if version already exists
    existing_version = db.query(ProjectVersion).filter(
        ProjectVersion.project_id == project_id,
        ProjectVersion.version == version.version
    ).first()
    if existing_version:
        raise HTTPException(status_code=400, detail="Version already exists")

    # Set all other versions as not current
    db.query(ProjectVersion).filter(ProjectVersion.project_id == project_id).update({"is_current": False})

    db_version = ProjectVersion(
        project_id=project_id,
        version=version.version,
        description=version.description,
        is_current=True
    )
    db.add(db_version)
    db.commit()
    db.refresh(db_version)

    return db_version


@router.get("/{project_id}/my-role")
async def get_my_project_role(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's role in the project"""
    db_project = get_project(db, project_id=project_id)
    if db_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if not check_project_access(db_project, current_user, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to access this project"
        )

    # Determine user's role in this project
    user_role = None
    assigned_lifecycle_stage = None
    assigned_lifecycle_stages = []
    if current_user.role == UserRole.SYS_ADMIN:
        # Sys admin is always admin in every project
        user_role = "admin"
    else:
        # Check if user is owner (project creator = admin)
        if db_project.owner_id == current_user.id:
            user_role = "admin"
        else:
            # Check if user is member and get their role
            member = db.query(ProjectMember).filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id
            ).first()
            if member:
                user_role = member.role.value
                assigned_lifecycle_stages = _get_member_assigned_lifecycle_stages(member)
                assigned_lifecycle_stage = assigned_lifecycle_stages[0] if assigned_lifecycle_stages else None

    # Deserialize lifecycle stages
    def safe_json_load(data):
        if not data:
            return None
        try:
            return json.loads(data)
        except json.JSONDecodeError:
            return None

    raw_lifecycle_stages = safe_json_load(db_project.lifecycle_stages)
    # Filter out 'other' flag — custom stage names come from custom_lifecycle_stages
    lifecycle_stages_data = [s for s in (raw_lifecycle_stages or []) if s not in ('other', 'Другие')] or None
    custom_lifecycle_stages_data = safe_json_load(db_project.custom_lifecycle_stages)

    return {
        "project_id": project_id,
        "user_id": current_user.id,
        "user_role": user_role,
        "assigned_lifecycle_stage": assigned_lifecycle_stage,
        "assigned_lifecycle_stages": assigned_lifecycle_stages,
        "user_name": f"{current_user.first_name} {current_user.last_name}",
        "project_name": db_project.name,
        "lifecycle_stages": lifecycle_stages_data,
        "custom_lifecycle_stages": custom_lifecycle_stages_data
    }
