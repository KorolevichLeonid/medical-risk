@echo off
chcp 65001 >nul
echo ============================================================
echo MIGRATION: Make risk scores nullable
echo ============================================================
echo.

REM Check if database exists
if not exist medical_risk.db (
    echo ERROR: medical_risk.db not found!
    echo Please run this script from the backend directory
    pause
    exit /b 1
)

echo 1. Creating backup...
copy medical_risk.db medical_risk_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.db >nul
if %errorlevel% equ 0 (
    echo ✓ Backup created successfully
) else (
    echo × Failed to create backup
    pause
    exit /b 1
)

echo.
echo 2. Running migration script...
python migrate_risk_factors.py
if %errorlevel% equ 0 (
    echo.
    echo ✓ Migration completed successfully!
) else (
    echo.
    echo × Migration failed!
    echo Check the error messages above
)

echo.
echo Press any key to close...
pause >nul

