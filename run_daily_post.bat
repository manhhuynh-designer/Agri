@echo off
cd /d "e:\FREELANCE\linkweb\Agri"

echo ==================================================
echo [Agri Blog] DANG TIEN HANH TAO BAI VIET TU DONG...
echo %date% %time%
echo ==================================================

:: Run the generator script (tao bai viet, KHONG gui email)
node scripts/generate_daily_post.js

:: Check if there are any changes in the git repository (new posts, topics data, etc.)
git status --porcelain | findstr /R "^?? ^ M ^ A" > nul
if %errorlevel% equ 0 (
    echo [Agri Blog] Phat hien co thay doi. Dang add, commit va push len GitHub...
    git add .
    git commit -m "Auto: Update daily blog post from local scheduler"
    git push origin main
    if %errorlevel% equ 0 (
        echo [Agri Blog] Da push thanh cong len GitHub!
        echo [Agri Blog] Dang gui email thong bao cho subscriber...
        node scripts/send_post_notification.js
    ) else (
        echo [Agri Blog] LOI: Push that bai! Email se KHONG duoc gui.
    )
) else (
    echo [Agri Blog] Khong co bai viet moi hoac thay doi nao de commit.
)

echo ==================================================
echo [Agri Blog] THAO TAC HOAN TAT!
echo ==================================================
pause
