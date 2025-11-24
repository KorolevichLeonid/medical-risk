"""
Script to create a system administrator for Azure auth system
Run this after your first Azure login to assign admin role
"""

import sqlite3
import sys

def create_sys_admin(email):
    """Assign sys_admin role to a user by email"""
    try:
        conn = sqlite3.connect('medical_risk.db')
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute("SELECT id, email, first_name, last_name, role FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"❌ User with email {email} not found!")
            print("   Please log in through Azure first to create the user account.")
            return False
        
        user_id, user_email, first_name, last_name, current_role = user
        
        print(f"📄 Found user: {first_name} {last_name} ({user_email})")
        print(f"   Current role: {current_role or 'No role assigned'}")
        
        # Update role to sys_admin
        cursor.execute("UPDATE users SET role = 'sys_admin' WHERE email = ?", (email,))
        conn.commit()
        
        print(f"✅ Successfully assigned sys_admin role to {user_email}")
        print(f"   User can now access Role Management to assign roles to other users.")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        conn.close()

def show_users():
    """Show all users in the system"""
    try:
        conn = sqlite3.connect('medical_risk.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT email, first_name, last_name, role, is_active FROM users ORDER BY created_at")
        users = cursor.fetchall()
        
        if not users:
            print("📭 No users found in the system")
            return
        
        print(f"👥 Users in the system ({len(users)} total):")
        print("-" * 80)
        for email, first_name, last_name, role, is_active in users:
            status = "🟢 Active" if is_active else "🔴 Inactive"
            role_text = role or "❌ No role"
            print(f"  {email:<30} | {first_name} {last_name:<20} | {role_text:<15} | {status}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🔧 Azure Authentication Admin Tool")
    print("=" * 50)
    
    if len(sys.argv) == 1:
        # Show usage
        print("Usage:")
        print("  python create_admin.py list                    - Show all users")
        print("  python create_admin.py admin user@email.com    - Make user sys_admin")
        print("")
        print("Example:")
        print("  python create_admin.py admin john@company.com")
        
    elif len(sys.argv) == 2 and sys.argv[1] == "list":
        show_users()
        
    elif len(sys.argv) == 3 and sys.argv[1] == "admin":
        email = sys.argv[2]
        success = create_sys_admin(email)
        if success:
            print("\n🎉 Done! Restart the backend server and refresh the frontend.")
    else:
        print("❌ Invalid arguments. Use 'list' or 'admin <email>'")
