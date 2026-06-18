$ErrorActionPreference = "Stop"
$Port = 4173
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Test-Port([int]$PortNumber) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $PortNumber)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

if (Test-Port $Port) {
    Start-Process "http://localhost:$Port"
    exit 0
}

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command py -ErrorAction SilentlyContinue }

if ($python) {
    Start-Process -FilePath $python.Source -ArgumentList @("-m", "http.server", $Port, "--bind", "127.0.0.1") -WorkingDirectory $Root -WindowStyle Minimized
    Start-Sleep -Milliseconds 900
    Start-Process "http://localhost:$Port"
    Write-Host "Orbit Pop http://localhost:$Port adresinde calisiyor." -ForegroundColor Cyan
    exit 0
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Start-Process -FilePath $node.Source -ArgumentList @("server.mjs") -WorkingDirectory $Root
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:$Port"
    exit 0
}

Write-Host "Python veya Node.js bulunamadi." -ForegroundColor Red
Write-Host "Python kurduktan sonra BASLAT.ps1 dosyasini yeniden calistirin."
Read-Host "Cikmak icin Enter"
