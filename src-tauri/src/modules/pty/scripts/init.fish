# gencode-shell-integration (fish)
# Emits OSC 7 (cwd) + OSC 133 A/B/C/D so the host tracks cwd and prompt
# boundaries without re-parsing the prompt.

if set -q __GENCODE_HOOKS_LOADED
    exit 0
end
set -g __GENCODE_HOOKS_LOADED 1

# Welcome banner — shown once per session
if not set -q __GENCODE_WELCOME_SHOWN; and set -q GENCODE_TERMINAL
    set -g __GENCODE_WELCOME_SHOWN 1
    echo -e "\033[1;36m GenCode / 灵码ADE\033[0m  \033[2mAI 原生终端 | Terminal-first Dev Workspace\033[0m"
    echo -e "\033[2m输入命令开始 | Type to begin\033[0m"
end

set -g __GENCODE_HOST (uname -n 2>/dev/null; or echo localhost)

# URL-encode a path keeping `/` intact so it stays valid inside file://.
function __gencode_urlencode_path
    set -l parts (string split '/' -- $argv[1])
    set -l out
    for p in $parts
        if test -n "$p"
            set out $out (string escape --style=url -- $p)
        else
            set out $out ""
        end
    end
    string join '/' $out
end

function __gencode_restore_status
    return $argv[1]
end

if functions -q fish_prompt
    functions -c fish_prompt __gencode_user_prompt
end

function fish_prompt
    set -l __gencode_status $status
    printf '\e]133;D;%d\e\\' $__gencode_status
    printf '\e]7;file://%s%s\e\\' "$__GENCODE_HOST" (__gencode_urlencode_path "$PWD")
    printf '\e]133;A\e\\'
    __gencode_restore_status $__gencode_status
    if functions -q __gencode_user_prompt
        __gencode_user_prompt
    else
        printf '%s > ' (prompt_pwd)
    end
    printf '\e]133;B\e\\'
end

function __gencode_preexec --on-event fish_preexec
    set -l cmd (string replace -ra '[\x00-\x1f\x7f]' ' ' -- "$argv")
    printf '\e]133;C;%s\e\\' (string sub -l 256 -- "$cmd")
end
