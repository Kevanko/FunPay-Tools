param(
    [string]$PythonExecutable = (Get-Command python.exe -ErrorAction Stop).Source
)
$ErrorActionPreference = 'Stop'
$PythonExecutable = (& $PythonExecutable -c 'import sys; print(sys.executable)').Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $PythonExecutable -PathType Leaf)) { throw 'Python executable not found' }
$InstallRoot = Join-Path $env:LOCALAPPDATA 'FunPayTools\desktop'
$ExtensionPath = Join-Path $InstallRoot 'extension'
$Hash = [Security.Cryptography.SHA256]::Create()
try { $IdBytes = $Hash.ComputeHash([Text.Encoding]::Unicode.GetBytes($ExtensionPath)) } finally { $Hash.Dispose() }
$ExtensionId = -join (($IdBytes | Select-Object -First 16) | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })
New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'updater_host.py') -Destination (Join-Path $InstallRoot 'updater_host.py') -Force
$Launcher = Join-Path $InstallRoot 'updater.cmd'
[IO.File]::WriteAllText($Launcher, '@echo off' + "`r`nchcp 65001 >nul`r`n" + '"' + $PythonExecutable + '" -B "' + (Join-Path $InstallRoot 'updater_host.py') + '" %*' + "`r`n", [Text.UTF8Encoding]::new($false))
$HostManifest = Join-Path $InstallRoot 'tools.funpay.updater.json'
$ManifestJson = @{ name='tools.funpay.updater'; description='FunPay Tools release updater'; path=$Launcher; type='stdio'; allowed_origins=@("chrome-extension://$ExtensionId/") } | ConvertTo-Json
[IO.File]::WriteAllText($HostManifest, $ManifestJson, [Text.UTF8Encoding]::new($false))
& $PythonExecutable -B (Join-Path $InstallRoot 'updater_host.py') --install
if ($LASTEXITCODE -ne 0) { throw 'Unable to install extension release' }
$RegistryKey = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\tools.funpay.updater'
New-Item -Path $RegistryKey -Force | Out-Null
Set-Item -LiteralPath $RegistryKey -Value $HostManifest
Write-Output $ExtensionPath
Write-Output "Extension ID: $ExtensionId"
