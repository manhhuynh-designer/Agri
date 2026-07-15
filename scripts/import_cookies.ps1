# Import cookies from clipboard to ~/.notebooklm-mcp/auth.json and Vercel

$ErrorActionPreference = "Stop"

Write-Host "=== ĐANG NHẬP COOKIES TỪ CLIPBOARD ===" -ForegroundColor Green

# Lấy dữ liệu từ Clipboard
$clipboard = Get-Clipboard
if (-not $clipboard -or $clipboard.Trim() -eq "") {
    Write-Error "Lỗi: Clipboard trống! Vui lòng chạy lệnh 'copy(document.cookie)' trong Console của trang NotebookLM trước."
}

$cookies = $clipboard.Trim()

# Kiểm tra cơ bản xem có phải cookies của Google không (chứa SID)
if (-not ($cookies -match "SID=")) {
    Write-Error "Lỗi: Dữ liệu clipboard không phải là Google Cookies hợp lệ (thiếu khóa 'SID').`nHướng dẫn: Truy cập https://notebooklm.google.com, nhấn F12 -> chọn tab Console -> gõ copy(document.cookie) -> quay lại đây chạy script."
}

# Tạo thư mục nếu chưa có
$mcpDir = Join-Path $env:USERPROFILE ".notebooklm-mcp"
if (-not (Test-Path $mcpDir)) {
    New-Item -ItemType Directory -Path $mcpDir -Force | Out-Null
}

# Tạo cấu trúc file auth.json
$authData = [PSCustomObject]@{
    cookies = $cookies
    updatedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
} | ConvertTo-Json

$authPath = Join-Path $mcpDir "auth.json"
Set-Content -Path $authPath -Value $authData -Force

Write-Host "✓ Đã nhập và cấu hình tệp auth.json thành công!" -ForegroundColor Green

# Tự động đẩy cookie mới lên Vercel
Write-Host "`nĐang đồng bộ hóa cookies mới lên Vercel..." -ForegroundColor Cyan
$cookies | & vercel env add NOTEBOOKLM_COOKIES production

Write-Host "✓ Đã cập nhật NOTEBOOKLM_COOKIES lên Vercel thành công!" -ForegroundColor Green
