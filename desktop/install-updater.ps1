param(
    [string]$PythonExecutable = (Get-Command python.exe -ErrorAction Stop).Source,
    [string]$ExtensionDirectory
)
$ErrorActionPreference = 'Stop'
$PythonExecutable = (& $PythonExecutable -c 'import sys; print(sys.executable)').Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $PythonExecutable -PathType Leaf)) { throw 'Python executable not found' }
$InstallRoot = Join-Path $env:LOCALAPPDATA 'FunPayTools\desktop'
$ExtensionPath = Join-Path $InstallRoot 'extension'
if ($ExtensionDirectory) {
    $ExtensionPath = [IO.Path]::GetFullPath($ExtensionDirectory).TrimEnd('\')
    $Existing = Get-Content -LiteralPath (Join-Path $ExtensionPath 'manifest.json') -Raw | ConvertFrom-Json
    if ($Existing.name -ne 'FunPay Tools' -or $Existing.manifest_version -ne 3) { throw 'Not a FunPay Tools installation' }
    $Parent = [IO.DirectoryInfo]::new($ExtensionPath)
    while ($Parent) { if (Test-Path -LiteralPath (Join-Path $Parent.FullName '.git')) { throw 'Source checkouts cannot be updated' }; $Parent = $Parent.Parent }
}
$Hash = [Security.Cryptography.SHA256]::Create()
try { $IdBytes = $Hash.ComputeHash([Text.Encoding]::Unicode.GetBytes($ExtensionPath)) } finally { $Hash.Dispose() }
$ExtensionId = -join (($IdBytes | Select-Object -First 16) | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })
New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'updater_host.py') -Destination (Join-Path $InstallRoot 'updater_host.py') -Force
$Launcher = Join-Path $InstallRoot 'updater.cmd'
[IO.File]::WriteAllText($Launcher, '@echo off' + "`r`nchcp 65001 >nul`r`n" + '"' + $PythonExecutable + '" -B "' + (Join-Path $InstallRoot 'updater_host.py') + '" %*' + "`r`n", [Text.UTF8Encoding]::new($false))
$HostManifest = Join-Path $InstallRoot 'tools.funpay.updater.json'
$Origins = @()
if (Test-Path -LiteralPath $HostManifest) { $Origins = @((Get-Content -LiteralPath $HostManifest -Raw | ConvertFrom-Json).allowed_origins) }
$Origin = "chrome-extension://$ExtensionId/"
$Origins = @($Origins + $Origin | Select-Object -Unique)
if ($ExtensionDirectory) {
    $BindingsFile = Join-Path $InstallRoot 'installations.json'
    $Bindings = @{}
    if (Test-Path -LiteralPath $BindingsFile) { $Previous = Get-Content -LiteralPath $BindingsFile -Raw | ConvertFrom-Json; foreach ($Property in $Previous.PSObject.Properties) { $Bindings[$Property.Name] = $Property.Value } }
    $Bindings[$Origin] = $ExtensionPath
    [IO.File]::WriteAllText($BindingsFile, ($Bindings | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
}
$ManifestJson = @{ name='tools.funpay.updater'; description='FunPay Tools release updater'; path=$Launcher; type='stdio'; allowed_origins=$Origins } | ConvertTo-Json
[IO.File]::WriteAllText($HostManifest, $ManifestJson, [Text.UTF8Encoding]::new($false))
if ($ExtensionDirectory) { & $PythonExecutable -B (Join-Path $InstallRoot 'updater_host.py') --install --origin $Origin }
else { & $PythonExecutable -B (Join-Path $InstallRoot 'updater_host.py') --install }
if ($LASTEXITCODE -ne 0) { throw 'Unable to install extension release' }
$RegistryKey = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\tools.funpay.updater'
New-Item -Path $RegistryKey -Force | Out-Null
Set-Item -LiteralPath $RegistryKey -Value $HostManifest
Write-Output $ExtensionPath
Write-Output "Extension ID: $ExtensionId"
