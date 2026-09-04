# Starts a local dist_web origin and a Cloudflare quick tunnel.
# Prints the live trycloudflare.com URL. Keeps both processes in this window.
# Permanent host still needs Workers onboarding or Pages Edit (see deploy_cloudflare.py).

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root "dist_web"
$Port = 8799

if (-not (Test-Path (Join-Path $Dist "index.html"))) {
  Write-Error "Missing dist_web/index.html. Run: python tools/build_web_dist.py"
}

function Test-Origin {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-Origin)) {
  Write-Host "[tunnel] Starting origin on http://127.0.0.1:$Port ..."
  Start-Process -WindowStyle Hidden -FilePath "python" -ArgumentList "-m","http.server","$Port" -WorkingDirectory $Dist
  $deadline = (Get-Date).AddSeconds(8)
  while (-not (Test-Origin)) {
    if ((Get-Date) -gt $deadline) {
      Write-Error "Origin failed to start on port $Port"
    }
    Start-Sleep -Milliseconds 250
  }
} else {
  Write-Host "[tunnel] Origin already up on http://127.0.0.1:$Port"
}

Write-Host "[tunnel] Starting Cloudflare quick tunnel..."
Write-Host "[tunnel] Leave this window open. Closing it takes the public URL offline."
npx --yes cloudflared tunnel --url "http://127.0.0.1:$Port" --protocol http2
