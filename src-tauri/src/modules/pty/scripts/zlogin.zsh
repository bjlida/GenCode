# gencode-shell-integration (zlogin)
#
# This is the LAST init file zsh runs before entering the prompt loop, so its
# exit status becomes `$?` for the very first prompt. Without the trailing `:`,
# users without a personal ~/.zlogin (the common case) hit a non-zero $? on
# first render — themes that condition prompt color on `%?` (robbyrussell etc.)
# show a red error indicator on a clean shell start.
{
  _gencode_user_zdotdir="${GENCODE_USER_ZDOTDIR:-$HOME}"
  [ -f "$_gencode_user_zdotdir/.zlogin" ] && source "$_gencode_user_zdotdir/.zlogin"
  unset _gencode_user_zdotdir
}
:
