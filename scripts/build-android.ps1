param(
    [string]$OutputDirectory = (Join-Path $env:USERPROFILE 'FunPayTools_build'),
    [string]$AndroidSdk = $env:ANDROID_HOME
)
$ErrorActionPreference = 'Stop'
$SourceDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\android'))
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$StageDirectory = [IO.Path]::GetFullPath((Join-Path $OutputDirectory 'android-build'))
if ($StageDirectory -notmatch '^[\x00-\x7F]+$') { throw 'Use an ASCII output directory on Windows, for example C:\FunPayTools_build' }
if (-not $StageDirectory.StartsWith($OutputDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid staging directory' }
if (-not $AndroidSdk -or -not (Test-Path -LiteralPath $AndroidSdk)) { throw 'Set ANDROID_HOME or pass -AndroidSdk with the Android SDK path' }
New-Item -ItemType Directory -Force -Path $StageDirectory | Out-Null
foreach ($Item in @('build.gradle', 'settings.gradle', 'gradle.properties', 'gradlew', 'gradlew.bat', 'gradle')) {
    Copy-Item -LiteralPath (Join-Path $SourceDirectory $Item) -Destination $StageDirectory -Recurse -Force
}
New-Item -ItemType Directory -Force -Path (Join-Path $StageDirectory 'app') | Out-Null
Copy-Item -LiteralPath (Join-Path $SourceDirectory 'app\build.gradle') -Destination (Join-Path $StageDirectory 'app') -Force
Copy-Item -LiteralPath (Join-Path $SourceDirectory 'app\src') -Destination (Join-Path $StageDirectory 'app') -Recurse -Force
$env:ANDROID_HOME = $AndroidSdk
& (Join-Path $StageDirectory 'gradlew.bat') -p $StageDirectory --no-daemon testDebugUnitTest lintDebug assembleDebug
if ($LASTEXITCODE -ne 0) { throw 'Android verification or build failed' }
$Apk = Join-Path $OutputDirectory 'FunPay-Pocket-1.0.0.apk'
Copy-Item -LiteralPath (Join-Path $StageDirectory 'app\build\outputs\apk\debug\app-debug.apk') -Destination $Apk -Force
Write-Output $Apk
