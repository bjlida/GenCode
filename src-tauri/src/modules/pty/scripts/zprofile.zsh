# gencode-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  _gencode_user_zdotdir="${GENCODE_USER_ZDOTDIR:-$HOME}"
  [ -f "$_gencode_user_zdotdir/.zprofile" ] && source "$_gencode_user_zdotdir/.zprofile"
  unset _gencode_user_zdotdir
}
:
