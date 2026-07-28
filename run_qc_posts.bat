@echo off
cd /d "e:\FREELANCE\linkweb\Agri"

echo ==================================================
echo [AGY QC AGENT] KICH HOAT KIEM DUYET BAI VIET DING KY (21:00)...
echo %date% %time%
echo ==================================================

:: Run the AGY QC Agent script
node scripts/qc_agent_daily.js

echo ==================================================
echo [AGY QC AGENT] THAO TAC KIEM DUYET HOAN TAT!
echo ==================================================

:: Chi pause neu chay thu cong qua Double Click
echo %cmdcmdline% | findstr /i "run_qc_posts.bat" >nul
if %errorlevel% equ 0 pause
