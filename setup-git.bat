@echo off
echo Setting up Git repository for Vendra App...
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/download/win
    echo Then restart this script
    pause
    exit /b 1
)

echo Git is installed. Proceeding with setup...
echo.

REM Initialize git repository
echo Initializing Git repository...
git init

REM Add all files
echo Adding all files...
git add .

REM Create initial commit
echo Creating initial commit...
git commit -m "Initial commit: Vendra App - Real Estate Platform"

echo.
echo ✅ Local Git repository has been set up successfully!
echo.
echo Next steps:
echo 1. Go to https://github.com and create a new repository called 'vendra-app'
echo 2. Copy the repository URL (it will look like: https://github.com/YOUR_USERNAME/vendra-app.git)
echo 3. Run these commands (replace YOUR_USERNAME with your GitHub username):
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/vendra-app.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 4. Your project will be uploaded to GitHub!
echo.
pause