# Remove "Open in GenCode" Explorer context menu entries.

$ErrorActionPreference = "Stop"

$targets = @(
    "HKCU:\Software\Classes\Directory\shell\OpenInGenCode",
    "HKCU:\Software\Classes\Directory\Background\shell\OpenInGenCode",
    "HKCU:\Software\Classes\Drive\shell\OpenInGenCode"
)

foreach ($base in $targets) {
    if (Test-Path -LiteralPath $base) {
        Remove-Item -LiteralPath $base -Recurse -Force
    }
}

Write-Host "Removed GenCode Explorer context menu entries."
