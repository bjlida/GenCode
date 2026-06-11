# Register "Open in GenCode" on folder/drive right-click (portable / manual install).
# Run from the folder that contains gencode.exe, or pass -ExePath explicitly.

param(
    [string]$ExePath = (Join-Path $PSScriptRoot "gencode.exe")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ExePath)) {
    Write-Error "gencode.exe not found: $ExePath"
}

$ExePath = (Resolve-Path -LiteralPath $ExePath).Path
$quotedExe = "`"$ExePath`""
$icon = "`"$ExePath`",0"
$command = "$quotedExe `"%V`""

$targets = @(
    "HKCU:\Software\Classes\Directory\shell\OpenInGenCode",
    "HKCU:\Software\Classes\Directory\Background\shell\OpenInGenCode",
    "HKCU:\Software\Classes\Drive\shell\OpenInGenCode"
)

foreach ($base in $targets) {
    New-Item -Path $base -Force | Out-Null
    Set-ItemProperty -Path $base -Name "(default)" -Value "用 GenCode 打开"
    Set-ItemProperty -Path $base -Name "Icon" -Value $icon
    Set-ItemProperty -Path $base -Name "NoWorkingDirectory" -Value ""
    New-Item -Path "$base\command" -Force | Out-Null
    Set-ItemProperty -Path "$base\command" -Name "(default)" -Value $command
}

Write-Host "Registered context menu for: $ExePath"
Write-Host "Right-click a folder in Explorer and choose '用 GenCode 打开'."
