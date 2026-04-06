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

        # ── 1. Clear old role_permissions (full reset) ──
        db.query(RolePermission).delete()
        db.commit()
        print("[*] Cleared old role-permission mappings")

        # ── 2. Define all permissions ──
        permissions_data = [
            {"key": "view_project", "label_ru": "Просмотр проекта"},
            {"key": "view_all", "label_ru": "Просмотр всех этапов и данных"},
            {"key": "view_own_stage", "label_ru": "Просмотр только своего этапа ЖЦ"},
            {"key": "create_project", "label_ru": "Создание проекта"},
            {"key": "edit_project", "label_ru": "Редактирование проекта"},
            {"key": "delete_project", "label_ru": "Удаление проекта"},
            {"key": "manage_subscriptions", "label_ru": "Управление подписками"},
            {"key": "assign_lifecycle_access", "label_ru": "Назначение доступа к этапам ЖЦ"},
            {"key": "manage_members", "label_ru": "Управление участниками проекта"},
            {"key": "create_risks", "label_ru": "Создание рисков и мер управления"},
            {"key": "edit_risks", "label_ru": "Редактирование рисков и мер управления"},
            {"key": "edit_risk_tables", "label_ru": "Работа с таблицами управления рисками"},
            {"key": "assess_severity", "label_ru": "Оценка тяжести вреда и пользы/вреда"},
            {"key": "assess_probability", "label_ru": "Оценка вероятности"},
            {"key": "create_report", "label_ru": "Создание отчёта"},
        ]

        # Insert / update permissions
        for perm_data in permissions_data:
            existing = db.query(Permission).filter(Permission.key == perm_data["key"]).first()
            if not existing:
                permission = Permission(
                    key=perm_data["key"],
                    label_ru=perm_data["label_ru"]
                )
                db.add(permission)
                print(f"[+] Added permission: {perm_data['key']}")
            else:
                existing.label_ru = perm_data["label_ru"]
                print(f"[~] Updated permission: {perm_data['key']}")

        db.commit()

        # Remove old permissions that are no longer used
        old_permission_keys = [
            "edit_source_data", "edit_risk_values", "verify_report",
            "view_report", "manage_users_roles", "create_rmf",
            "chat_comment", "edit_own_lifecycle_stage",
            "assign_product_manager"
        ]
        for old_key in old_permission_keys:
            old_perm = db.query(Permission).filter(Permission.key == old_key).first()
            if old_perm:
                db.delete(old_perm)
                print(f"[-] Removed old permission: {old_key}")
        db.commit()

        # ── 3. Define role-permission mappings ──
        #
        # Roles (new system):
        #   admin                         – creates project and appoints product manager
        #   manager (product manager)     – fills project and manages non-admin/non-manager roles
        #   risk_assessment_team_leader   – risk team leader (probability-focused)
        #   doctor                        – doctor (severity/harm-focused)
        #   specialist                    – own lifecycle stage risks only
        #
        role_permissions_data = [
            # ── Admin ──
            # Создатель проекта — полный доступ ко всему
            {"role": "admin", "permissions": [
                "view_project",
                "view_all",
                "create_project",
                "edit_project",
                "delete_project",
                "manage_subscriptions",
                "assign_lifecycle_access",
                "manage_members",
                "create_risks",
                "edit_risks",
                "edit_risk_tables",
                "assess_severity",
                "assess_probability",
                "create_report",
            ]},
            # ── Manager ──
            # Управление участниками и ролями — только у администратора
            {"role": "manager", "permissions": [
                "view_project",
                "view_all",
                "edit_project",
                "create_risks",
                "edit_risks",
                "edit_risk_tables",
                "create_report",
            ]},
            # ── Risk Assessment Team Leader ──
            {"role": "risk_assessment_team_leader", "permissions": [
                "view_project",
                "view_all",
                "create_risks",
                "edit_risks",
                "edit_risk_tables",
                "assess_probability",
            ]},
            # ── Doctor ──
            {"role": "doctor", "permissions": [
                "view_project",
                "view_all",
                "edit_risk_tables",
                "assess_severity",
            ]},
            # ── Specialist (lifecycle stage) ──
            {"role": "specialist", "permissions": [
                "view_project",
                "view_own_stage",
                "create_risks",
                "edit_risks",
                "edit_risk_tables",
            ]},
        ]

        # Insert role-permission mappings
        for role_data in role_permissions_data:
            role_name = role_data["role"]
            for perm_key in role_data["permissions"]:
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
