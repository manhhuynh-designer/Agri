@echo off
cd /d "e:\FREELANCE\linkweb\Agri"

echo ==================================================
echo [Agri Blog] DANG TIEN HANH TAO BAI VIET TU DONG...
echo %date% %time%
echo ==================================================

:: Run the generator script (tao bai viet, upload R2 va luu pending email)
node scripts/generate_daily_post.js

:: Gui email thong bao cho subscriber (KHONG can git push vi bai viet da cap nhat truc tiep len Cloudflare R2)
echo [Agri Blog] Dang gui email thong bao cho subscriber...
node scripts/send_post_notification.js

echo ==================================================
echo [Agri Blog] THAO TAC HOAN TAT!
echo ==================================================

:: Chi pause neu chay bang double-click (cmdcmdline co chua bat file va khong chay qua Task Scheduler)
echo %cmdcmdline% | findstr /i "run_daily_post.bat" >nul
if %errorlevel% equ 0 pause

