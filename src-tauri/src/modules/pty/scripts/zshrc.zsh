# gencode-shell-integration (zshrc)
#
# Emits OSC 7 (cwd) + OSC 133 A/B/C/D (prompt-start / prompt-end / pre-exec /
# command-done-with-exit-code) so the host can detect command boundaries and
# track cwd without re-parsing the prompt. `status` is a read-only special in
# zsh, so we shadow $? into `_gencode_ret`.

{
  _gencode_user_zdotdir="${GENCODE_USER_ZDOTDIR:-$HOME}"
  [ -f "$_gencode_user_zdotdir/.zshrc" ] && source "$_gencode_user_zdotdir/.zshrc"
  unset _gencode_user_zdotdir
}

# Welcome banner — shown once per session
if [[ -z "$__GENCODE_WELCOME_SHOWN" && -n "$GENCODE_TERMINAL" ]]; then
  __GENCODE_WELCOME_SHOWN=1
  echo -e "\033[1;36m GenCode / 灵码ADE\033[0m  \033[2mAI 原生终端 | Terminal-first Dev Workspace\033[0m"
  echo -e "\033[2m 输入命令开始 | Type to begin\033[0m"
fi

# Re-source guard within a single shell (e.g. user runs `source ~/.zshrc`).
# This is NOT exported, so each nested zsh installs its own hooks — desired,
# since every interactive shell needs its own prompt integration.
if [[ -z "$__GENCODE_HOOKS_LOADED" ]]; then
  __GENCODE_HOOKS_LOADED=1
  autoload -Uz add-zsh-hook 2>/dev/null

  # URL-encode $PWD byte-wise so multi-byte paths stay valid in the `file://`
  # URI emitted via OSC 7. `no_multibyte` forces ${s[i]} to index bytes (not
  # code points), and LC_ALL=C keeps the [a-zA-Z0-9...] class single-byte.
  _gencode_urlencode() {
    emulate -L zsh
    setopt localoptions no_multibyte
    local LC_ALL=C s="$1" i byte
    for (( i=1; i<=${#s}; i++ )); do
      byte="${s[i]}"
      case "$byte" in
        [a-zA-Z0-9/._~-]) printf '%s' "$byte" ;;
        *) printf '%%%02X' "'$byte" ;;
      esac
    done
  }

  _gencode_precmd() {
    local _gencode_ret=$?
    printf '\e]133;D;%s\e\\' "$_gencode_ret"
    printf '\e]7;file://%s%s\e\\' "${HOST}" "$(_gencode_urlencode "$PWD")"
    # Re-inject prompt-end marker in case a framework rebuilt PS1 (p10k, starship).
    if [[ "$PS1" != *$'\e]133;B\e\\'* ]]; then
      PS1=$'%{\e]133;B\e\\%}'"$PS1"
    fi
    printf '\e]133;A\e\\'
  }

  _gencode_preexec() {
    local cmd="${1//[[:cntrl:]]/ }"
    printf '\e]133;C;%s\e\\' "${cmd[1,256]}"
  }

  if (( $+functions[add-zsh-hook] )); then
    add-zsh-hook precmd _gencode_precmd
    add-zsh-hook preexec _gencode_preexec
  fi

  _gencode_precmd
fi
:
