param(
  [string]$BaseUrl = 'http://localhost:3001',
  [string]$Path = '/auth/probe',
  [string]$Method = 'GET',
  [string]$Secret = $(if ($env:GATEWAY_SIG_SECRET) { $env:GATEWAY_SIG_SECRET } else { 'local-gateway-secret' }),
  [string]$UserId = 'probe-user'
)

$ts = [int][Math]::Floor(([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()))
$nonce = [guid]::NewGuid().ToString()
$canonical = "$($Method.ToUpper())|$Path|$UserId|$ts|$nonce"

# Compute HMAC-SHA256 signature (hex)
$hmac = New-Object System.Security.Cryptography.HMACSHA256 ([Text.Encoding]::UTF8.GetBytes($Secret))
$sigBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($canonical))
$hex = -join ($sigBytes | ForEach-Object { $_.ToString('x2') })

Write-Host "Calling $BaseUrl$Path with signed headers"
Write-Host "Canonical: $canonical"

$headers = @{
  'x-gw-sig'   = $hex
  'x-gw-ts'    = "$ts"
  'x-gw-nonce' = $nonce
  'x-user-id'  = $UserId
}

try {
  $resp = Invoke-RestMethod -Method Get -Uri ("$BaseUrl$Path") -Headers $headers -ErrorAction Stop
  Write-Host "Response:" -ForegroundColor Cyan
  $resp | ConvertTo-Json -Depth 10 | Write-Output
} catch {
  Write-Host "Request failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $respBody = $reader.ReadToEnd()
    Write-Host "Response: $respBody" -ForegroundColor Yellow
  }
  exit 1
}