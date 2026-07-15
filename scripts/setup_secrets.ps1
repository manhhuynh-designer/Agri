# Automation script to link Vercel and set GitHub Secrets

$ErrorActionPreference = "Stop"

Write-Host "=== BẮT ĐẦU TỰ ĐỘNG CẤU HÌNH BẢO MẬT VERCEL & GITHUB ===" -ForegroundColor Green

# 1. Liên kết dự án với Vercel
Write-Host "`n1. Đang liên kết dự án với Vercel..." -ForegroundColor Cyan
& vercel link --yes

# Kiểm tra tệp liên kết
$projectConfigPath = ".vercel/project.json"
if (-not (Test-Path $projectConfigPath)) {
    Write-Error "Lỗi: Không tìm thấy tệp liên kết Vercel .vercel/project.json!"
}

$projectJson = Get-Content $projectConfigPath | ConvertFrom-Json
$orgId = $projectJson.orgId
$projectId = $projectJson.projectId

Write-Host "✓ Đã tìm thấy Vercel Org ID: $orgId" -ForegroundColor Green
Write-Host "✓ Đã tìm thấy Vercel Project ID: $projectId" -ForegroundColor Green

# 2. Đăng ký biến môi trường lên Vercel
Write-Host "`n2. Đang đồng bộ hóa biến môi trường lên Vercel..." -ForegroundColor Cyan

# Đồng bộ PEXELS_API_KEY từ file .env cục bộ
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    foreach ($line in $envContent) {
        if ($line -match "^PEXELS_API_KEY=(.+)$") {
            $pexelsKey = $Matches[1].Trim()
            Write-Host " -> Đang đẩy PEXELS_API_KEY lên Vercel..." -ForegroundColor Yellow
            $pexelsKey | & vercel env add PEXELS_API_KEY production
            Write-Host " ✓ Đồng bộ PEXELS_API_KEY thành công!" -ForegroundColor Green
        }
    }
} else {
    Write-Host " -> Bỏ qua PEXELS_API_KEY (Không tìm thấy tệp .env cục bộ)." -ForegroundColor DarkYellow
}

# Đồng bộ NOTEBOOKLM_COOKIES từ tệp auth.json cục bộ
$authPath = Join-Path $env:USERPROFILE ".notebooklm-mcp\auth.json"
if (Test-Path $authPath) {
    $cookies = Get-Content $authPath -Raw
    if ($cookies) {
        Write-Host " -> Đang đẩy NOTEBOOKLM_COOKIES lên Vercel..." -ForegroundColor Yellow
        $cookies | & vercel env add NOTEBOOKLM_COOKIES production
        Write-Host " ✓ Đồng bộ NOTEBOOKLM_COOKIES thành công!" -ForegroundColor Green
    }
} else {
    Write-Host " -> Bỏ qua NOTEBOOKLM_COOKIES (Không tìm thấy cookies cục bộ)." -ForegroundColor DarkYellow
}

# 3. Đăng ký Vercel IDs lên GitHub Secrets
Write-Host "`n3. Đang cấu hình GitHub Secrets thông qua GitHub CLI..." -ForegroundColor Cyan

Write-Host " -> Đang đẩy VERCEL_ORG_ID..." -ForegroundColor Yellow
$orgId | & gh secret set VERCEL_ORG_ID
Write-Host " ✓ Đã thêm VERCEL_ORG_ID vào GitHub Secrets!" -ForegroundColor Green

Write-Host " -> Đang đẩy VERCEL_PROJECT_ID..." -ForegroundColor Yellow
$projectId | & gh secret set VERCEL_PROJECT_ID
Write-Host " ✓ Đã thêm VERCEL_PROJECT_ID vào GitHub Secrets!" -ForegroundColor Green

# 4. Yêu cầu Vercel Token để đẩy lên GitHub Secrets
Write-Host "`n--------------------------------------------------------" -ForegroundColor Yellow
Write-Host "BƯỚC CUỐI CÙNG: Cần cấu hình VERCEL_TOKEN trên GitHub" -ForegroundColor Yellow
Write-Host "Vui lòng mở liên kết sau và tạo một Token mới:" -ForegroundColor Yellow
Write-Host "https://vercel.com/account/tokens" -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow

$vercelToken = Read-Host "Dán Vercel Token của bạn vào đây (hoặc nhấn Enter để bỏ qua)"
if ($vercelToken -and $vercelToken.Trim() -ne "") {
    $vercelToken.Trim() | & gh secret set VERCEL_TOKEN
    Write-Host "✓ Đã cấu hình VERCEL_TOKEN vào GitHub Secrets thành công!" -ForegroundColor Green
} else {
    Write-Host "⚠ Đã bỏ qua cấu hình VERCEL_TOKEN. Bạn cần cấu hình thủ công sau." -ForegroundColor DarkYellow
}

Write-Host "`n=== TẤT CẢ CẤU HÌNH ĐÃ HOÀN TẤT THÀNH CÔNG! ===" -ForegroundColor Green
