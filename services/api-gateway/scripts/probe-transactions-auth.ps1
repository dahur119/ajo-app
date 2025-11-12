param(
  [string]$GatewayBaseUrl = $(if ($env:GATEWAY_BASE_URL) { $env:GATEWAY_BASE_URL } else { 'http://localhost:8080' }),
  [string]$Email = "probe_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())@example.com",
  [string]$Password = 'Secret123!'
)

Write-Host "Gateway base URL: $GatewayBaseUrl"
Write-Host "Using email: $Email"

function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$Body,
    [hashtable]$Headers
  )
  try {
    $json = $Body | ConvertTo-Json -Depth 10
    return Invoke-RestMethod -Method Post -Uri $Url -Body $json -ContentType 'application/json' -Headers $Headers -ErrorAction Stop
  } catch {
    Write-Host "POST $Url failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $respBody = $reader.ReadToEnd()
      Write-Host "Response: $respBody" -ForegroundColor Yellow
    }
    throw
  }
}

function Invoke-JsonGet {
  param(
    [string]$Url,
    [hashtable]$Headers
  )
  try {
    return Invoke-RestMethod -Method Get -Uri $Url -Headers $Headers -ErrorAction Stop
  } catch {
    Write-Host "GET $Url failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $respBody = $reader.ReadToEnd()
      Write-Host "Response: $respBody" -ForegroundColor Yellow
    }
    throw
  }
}

# 1) Register user via gateway -> proxies to user-service
$registerUrl = "$GatewayBaseUrl/api/register"
Write-Host "Registering user at $registerUrl"
try {
  $regResp = Invoke-JsonPost -Url $registerUrl -Body @{ name = 'Probe User'; email = $Email; password = $Password; password_confirmation = $Password } -Headers @{}
  Write-Host "Register status: OK"
} catch {
  Write-Host "Registration may have failed or user already exists; continuing to login." -ForegroundColor Yellow
}

# 2) Login to get JWT
$loginUrl = "$GatewayBaseUrl/api/login"
Write-Host "Logging in at $loginUrl"
$loginResp = Invoke-JsonPost -Url $loginUrl -Body @{ email = $Email; password = $Password } -Headers @{}

$token = $null
if ($loginResp.token) { $token = $loginResp.token }
elseif ($loginResp.access_token) { $token = $loginResp.access_token }
elseif ($loginResp.data -and $loginResp.data.token) { $token = $loginResp.data.token }

if (-not $token) {
  throw "Could not extract JWT token from login response."
}

Write-Host "Obtained JWT token."

# 3) Call transactions auth probe via gateway
$probeUrl = "$GatewayBaseUrl/transactions/auth/probe"
Write-Host "Calling probe at $probeUrl"
$probeResp = Invoke-JsonGet -Url $probeUrl -Headers @{ Authorization = "Bearer $token"; 'x-email-verified' = 'true' }

Write-Host "Probe response:" -ForegroundColor Cyan
$probeResp | ConvertTo-Json -Depth 10 | Write-Output

Write-Host "Done." -ForegroundColor Green