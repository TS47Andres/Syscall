param(
  [switch]$Background,
  [switch]$Status,
  [switch]$Reset
)

$ErrorActionPreference = 'Stop'

$tailscaleCommand = Get-Command tailscale -ErrorAction SilentlyContinue
if (-not $tailscaleCommand -and (Test-Path 'C:\Program Files\Tailscale\tailscale.exe')) {
  $tailscaleCommand = Get-Item 'C:\Program Files\Tailscale\tailscale.exe'
}
if (-not $tailscaleCommand) {
  throw 'Tailscale is not installed or is not available on PATH. Install it from https://tailscale.com/download and sign in first.'
}
$tailscalePath = if ($tailscaleCommand.PSObject.Properties.Name -contains 'Source') { $tailscaleCommand.Source } else { $tailscaleCommand.FullName }

if ($Reset) {
  & $tailscalePath funnel reset
  exit $LASTEXITCODE
}

if ($Status) {
  & $tailscalePath funnel status
  exit $LASTEXITCODE
}

$apiPort = if ($env:API_PORT) { [int]$env:API_PORT } else { 3000 }
$healthUrl = "http://127.0.0.1:$apiPort/health"

try {
  $health = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 5
  if ($health.StatusCode -ne 200) { throw "API health check returned HTTP $($health.StatusCode)." }
} catch {
  throw "Syscall API is not healthy at $healthUrl. Start it with 'docker compose up -d --build' before enabling Funnel. Details: $($_.Exception.Message)"
}

Write-Host "Exposing only /webhooks/telnyx/ through Tailscale Funnel on API port $apiPort."
Write-Host 'Copy the https://*.ts.net hostname printed by Tailscale into PUBLIC_WEBHOOK_BASE_URL in .env.'
Write-Host 'The Telnyx webhook URLs will be /webhooks/telnyx/voice and /webhooks/telnyx/sms.'

$arguments = @('--set-path', '/webhooks/telnyx/')
if ($Background) { $arguments += '--bg' }
$arguments += "http://127.0.0.1:$apiPort/webhooks/telnyx/"
& $tailscalePath funnel @arguments
exit $LASTEXITCODE
