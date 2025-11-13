"""
Script to initialize permissions and role-permission relationships
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.project import Permission, RolePermission


def init_permissions():
    """Initialize permissions and role-permission mappings"""
    db = SessionLocal()
    try:
        print("[*] Initializing permissions...")

        # Define all permissions
        permissions_data = [
            {"key": "view_project", "label_ru": "Просмотр проекта"},
            {"key": "edit_project", "label_ru": "Редактирование проекта"},
            {"key": "delete_project", "label_ru": "Удаление проекта"},
            {"key": "manage_members", "label_ru": "Управление членами проекта"},
            {"key": "edit_risks", "label_ru": "Редактирование рисков"},
            {"key": "edit_risk_tables", "label_ru": "Редактирование таблиц рисков"},
            {"key": "view_all", "label_ru": "Просмотр всех блоков"},
            {"key": "edit_source_data", "label_ru": "Редактирование исходных данных"},
            {"key": "edit_risk_values", "label_ru": "Редактирование вероятности/вреда"},
            {"key": "verify_report", "label_ru": "Проверка/верификация отчёта"},
            {"key": "view_report", "label_ru": "Просмотр отчётов"},
            {"key": "manage_users_roles", "label_ru": "Управление пользователями/ролями"},
            {"key": "create_rmf", "label_ru": "Создание RMF"},
            {"key": "chat_comment", "label_ru": "Чат/комментарии к отклонению"},
            {"key": "edit_own_lifecycle_stage", "label_ru": "Редактирование своего этапа жизненного цикла"}
        ]

        # Insert permissions
        for perm_data in permissions_data:
            existing = db.query(Permission).filter(Permission.key == perm_data["key"]).first()
            if not existing:
                permission = Permission(
                    key=perm_data["key"],
                    label_ru=perm_data["label_ru"]
                )
                db.add(permission)
                print(f"[+] Added permission: {perm_data['key']}")

        db.commit()

        # Define role-permission mappings
        role_permissions_data = [
            # Admin - all permissions
            {"role": "admin", "permissions": [
                "view_project", "edit_project", "delete_project", "manage_members",
                "edit_risks", "edit_risk_tables", "view_all", "edit_source_data",
                "edit_risk_values", "verify_report", "manage_users_roles",
                "create_rmf", "chat_comment", "edit_own_lifecycle_stage"
            ]},
            # Top Manager
            {"role": "manager", "permissions": [
                "view_project", "edit_project", "manage_members", "edit_risks", "view_all", "chat_comment"
            ]},
            # Quality Management Representative
            {"role": "quality_management_representative", "permissions": [
                "view_project", "view_all", "chat_comment", "view_report"
            ]},
            # Product Manager / Quality Manager
            {"role": "product_manager", "permissions": [
                "view_project", "view_all", "edit_source_data", "view_report"
            ]},
            # Risk Assessment Team Leader
            {"role": "risk_assessment_team_leader", "permissions": [
                "view_project", "view_all", "edit_source_data", "edit_risk_values",
                "verify_report", "chat_comment", "edit_risk_tables"
            ]},
            # Member of the Risk Assessment Team
            {"role": "risk_assessment_team_member", "permissions": [
                "view_project", "view_all", "edit_risk_values", "edit_risk_tables"
            ]},
            # Clinical Evaluation / Doctor
            {"role": "doctor", "permissions": [
                "view_project", "view_all", "edit_risk_values", "edit_risk_tables"
            ]}
        ]

        # Insert role-permission mappings
        for role_data in role_permissions_data:
            role_name = role_data["role"]
            for perm_key in role_data["permissions"]:
                existing = db.query(RolePermission).filter(
                    RolePermission.role_name == role_name,
                    RolePermission.permission_key == perm_key
                ).first()

                if not existing:
                    role_perm = RolePermission(
                        role_name=role_name,
                        permission_key=perm_key
                    )
                    db.add(role_perm)
                    print(f"[+] Added role-permission: {role_name} -> {perm_key}")

        db.commit()
        print("[+] Permissions initialization completed!")

    except Exception as e:
        print(f"[!] Error initializing permissions: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    init_permissions()
