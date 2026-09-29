# File: tailscale-funnel.ps1
# Role: Publishes the API backend plus Telnyx webhook and voice-media routes through Tailscale Funnel.
# Service: Syscall deployment helper.
param(
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
$voiceAgentPort = if ($env:VOICE_AGENT_PORT) { [int]$env:VOICE_AGENT_PORT } else { 4000 }
$healthUrl = "http://127.0.0.1:$apiPort/health"
$voiceHealthUrl = "http://127.0.0.1:$voiceAgentPort/health"

try {
  $health = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 5
  if ($health.StatusCode -ne 200) { throw "API health check returned HTTP $($health.StatusCode)." }
} catch {
  throw "Syscall API is not healthy at $healthUrl. Start it with 'docker compose up -d --build' first. Details: $($_.Exception.Message)"
}

try {
  $voiceHealth = Invoke-WebRequest -UseBasicParsing -Uri $voiceHealthUrl -TimeoutSec 5
  if ($voiceHealth.StatusCode -ne 200) { throw "Voice agent health check returned HTTP $($voiceHealth.StatusCode)." }
} catch {
  throw "Syscall voice agent is not healthy at $voiceHealthUrl. Start it with 'docker compose --profile voice up -d --build' after configuring SARVAM_API_KEY and VOICE_AGENT_API_TOKEN. Details: $($_.Exception.Message)"
}

Write-Host "Publishing the API backend through Tailscale Funnel at https://<device>.ts.net -> http://127.0.0.1:$apiPort."
Write-Host 'The API is publicly reachable through HTTPS on Funnel port 443; Tailscale forwards it to the local backend port.'
Write-Host 'The host-side API port is loopback-only; MongoDB, Redis, SMTP, and ClamAV remain private.'

$apiArguments = @('--bg', '--https=443', '--set-path=/', '--yes', "http://127.0.0.1:$apiPort")
& $tailscalePath funnel @apiArguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$webhookArguments = @('--bg', '--https=443', '--set-path=/webhooks/telnyx/', '--yes', "http://127.0.0.1:$apiPort/webhooks/telnyx/")
& $tailscalePath funnel @webhookArguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$voiceArguments = @('--bg', '--https=443', '--set-path=/voice-stream', '--yes', "http://127.0.0.1:$voiceAgentPort/voice-stream")
& $tailscalePath funnel @voiceArguments
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $tailscalePath funnel status
exit $LASTEXITCODE
