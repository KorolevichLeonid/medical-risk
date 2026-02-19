"""
Database migration script for the new role system.

Migrates from any old role system to the new simplified role system:
  - admin, manager, specialist

Role mapping:
  - admin                              -> admin (unchanged)
  - manager                            -> manager (unchanged)
  - product_manager                    -> manager
  - risk_assessment_team_leader        -> manager
  - quality_management_representative  -> specialist (will need lifecycle stage assignment)
  - risk_assessment_team_member        -> specialist (will need lifecycle stage assignment)
  - doctor                             -> specialist (will need lifecycle stage assignment)

Also adds the `assigned_lifecycle_stage` column to `project_members` table.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import SessionLocal, engine


def migrate_roles():
    """Migrate database to new role system"""
    db = SessionLocal()
    try:
        print("=" * 60)
        print("  ROLE MIGRATION SCRIPT")
        print("=" * 60)

        # ── Step 1: Add assigned_lifecycle_stage column if not exists ──
        print("\n[1/4] Adding assigned_lifecycle_stage column...")
        try:
            db.execute(text("""
                ALTER TABLE project_members ADD COLUMN assigned_lifecycle_stage VARCHAR(255) NULL
            """))
            db.commit()
            print("  ✅ Column added successfully")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("  ⚠️  Column already exists, skipping")
                db.rollback()
            else:
                print(f"  ⚠️  Error (may be safe to ignore): {e}")
                db.rollback()

        # ── Step 2: Check current role distribution ──
        print("\n[2/4] Checking current role distribution...")
        result = db.execute(text("SELECT role, COUNT(*) as cnt FROM project_members GROUP BY role"))
        rows = result.fetchall()
        for row in rows:
            print(f"  - {row[0]}: {row[1]} members")

        # ── Step 3: Update ProjectRole enum values ──
        # For SQLite, enum is stored as text, so we just update the values directly
        print("\n[3/4] Migrating roles...")

        role_mapping = {
            'product_manager': 'manager',
            'risk_assessment_team_leader': 'manager',
            'quality_management_representative': 'specialist',
            'risk_assessment_team_member': 'specialist',
            'doctor': 'specialist',
        }

        for old_role, new_role in role_mapping.items():
            result = db.execute(
                text("UPDATE project_members SET role = :new_role WHERE role = :old_role"),
                {"new_role": new_role, "old_role": old_role}
            )
            count = result.rowcount
            if count > 0:
                print(f"  ✅ Migrated {count} members: {old_role} -> {new_role}")
            else:
                print(f"  ⏭️  No members with role '{old_role}'")

        db.commit()

        # ── Step 4: Verify final state ──
        print("\n[4/4] Verifying final role distribution...")
        result = db.execute(text("SELECT role, COUNT(*) as cnt FROM project_members GROUP BY role"))
        rows = result.fetchall()
        for row in rows:
            print(f"  - {row[0]}: {row[1]} members")

        # Check for specialists without assigned lifecycle stages
        result = db.execute(text(
            "SELECT COUNT(*) FROM project_members WHERE role = 'specialist' AND assigned_lifecycle_stage IS NULL"
        ))
        specialist_no_stage = result.scalar()
        if specialist_no_stage and specialist_no_stage > 0:
            print(f"\n  ⚠️  WARNING: {specialist_no_stage} specialist(s) have no assigned lifecycle stage!")
            print("  → These need to be manually updated by a manager in the project.")

        print("\n" + "=" * 60)
        print("  MIGRATION COMPLETE!")
        print("=" * 60)
        print("\n  Next steps:")
        print("  1. Run init_permissions.py to update permissions")
        print("  2. Assign lifecycle stages to specialists if needed")
        print("  3. Restart the backend server")

    except Exception as e:
        print(f"\n[!] Migration error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    migrate_roles()
