# gencode-shell-integration (PowerShell)
# Emits OSC 7 (cwd) + OSC 133 A/B/D so the host tracks cwd and prompt boundaries.

if ($global:__GENCODE_HOOKS_LOADED) { return }
$global:__GENCODE_HOOKS_LOADED = $true

# PS 5.1 in ConPTY needs VT processing or Write-Host/ANSI never reaches the PTY.
if ($PSVersionTable.PSVersion.Major -lt 6) {
    try {
        $win32 = Add-Type -Namespace GenCode -Name NativeMethods -PassThru -MemberDefinition @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern System.IntPtr GetStdHandle(int nStdHandle);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool GetConsoleMode(System.IntPtr hConsoleHandle, out uint lpMode);
[DllImport("kernel32.dll", SetLastError = true)]
public static extern bool SetConsoleMode(System.IntPtr hConsoleHandle, uint dwMode);
'@
        $handle = $win32::GetStdHandle(-11)
        [uint32]$mode = 0
        [void]$win32::GetConsoleMode($handle, [ref]$mode)
        [void]$win32::SetConsoleMode($handle, $mode -bor 4)
    } catch {}
}

try {
    [Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $global:OutputEncoding    = [System.Text.UTF8Encoding]::new($false)
} catch {}

# Welcome banner — shown once per session
if (-not $global:__GENCODE_WELCOME_SHOWN -and $env:GENCODE_TERMINAL) {
    $global:__GENCODE_WELCOME_SHOWN = $true
    Write-Host " GenCode / 灵码ADE" -ForegroundColor Cyan -NoNewline
    Write-Host "  AI 原生终端 | Terminal-first Dev Workspace" -ForegroundColor DarkGray
    Write-Host " 输入命令开始 | Type to begin" -ForegroundColor DarkGray
}

if (Test-Path Function:prompt) {
    Copy-Item Function:prompt Function:__gencode_user_prompt -Force -ErrorAction SilentlyContinue
}

function global:__gencode_urlencode {
    param([string]$s)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($s)
    $sb = [System.Text.StringBuilder]::new($bytes.Length)
    foreach ($b in $bytes) {
        if (($b -ge 0x30 -and $b -le 0x39) -or
            ($b -ge 0x41 -and $b -le 0x5A) -or
            ($b -ge 0x61 -and $b -le 0x7A) -or
            $b -eq 0x2F -or $b -eq 0x2E -or $b -eq 0x5F -or
            $b -eq 0x7E -or $b -eq 0x2D) {
            [void]$sb.Append([char]$b)
        } else {
            [void]$sb.AppendFormat('%{0:X2}', $b)
        }
    }
    $sb.ToString()
}

function global:prompt {
    $lec = $LASTEXITCODE
    if ($null -eq $lec) { $lec = if ($?) { 0 } else { 1 } }
    $esc = [char]27

    $oscD = "$esc]133;D;$lec$esc\"
    $oscA = "$esc]133;A$esc\"
    $oscB = "$esc]133;B$esc\"

    $loc = Get-Location
    $osc7 = ''
    if ($loc.Provider.Name -eq 'FileSystem') {
        $cwd = $loc.ProviderPath -replace '\\','/'
        if ($cwd -match '^[A-Za-z]:') { $cwd = "/$cwd" }
        $cwdEnc = __gencode_urlencode $cwd
        $hostName = [System.Environment]::MachineName
        $osc7 = "$esc]7;file://$hostName$cwdEnc$esc\"
    }

    $original = if (Test-Path Function:__gencode_user_prompt) {
        try { & __gencode_user_prompt } catch { "PS $((Get-Location).Path)> " }
    } else {
        "PS $((Get-Location).Path)> "
    }

    $global:LASTEXITCODE = $lec
    "$oscD$oscA$osc7${original}${oscB}"
}
