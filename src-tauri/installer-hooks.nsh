; 安装程序品牌自定义
; 呀米科技 (yamikeji.com) — GenCode/灵码ADE

!macro NSIS_HOOK_POSTINSTALL
  ; 右键菜单: "用 GenCode 打开"
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInGenCode" "" "用 GenCode 打开"
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInGenCode" "Icon" '"$INSTDIR\gencode.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInGenCode" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Directory\shell\OpenInGenCode\command" "" '"$INSTDIR\gencode.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInGenCode" "" "用 GenCode 打开"
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInGenCode" "Icon" '"$INSTDIR\gencode.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInGenCode" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Directory\Background\shell\OpenInGenCode\command" "" '"$INSTDIR\gencode.exe" "%V"'

  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInGenCode" "" "用 GenCode 打开"
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInGenCode" "Icon" '"$INSTDIR\gencode.exe",0'
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInGenCode" "NoWorkingDirectory" ""
  WriteRegStr HKCU "Software\Classes\Drive\shell\OpenInGenCode\command" "" '"$INSTDIR\gencode.exe" "%V"'

  ; 开始菜单: 程序 + 网站链接
  CreateDirectory "$SMPROGRAMS\GenCode"
  CreateShortCut "$SMPROGRAMS\GenCode\GenCode 灵码ADE.lnk" "$INSTDIR\gencode.exe" "" "$INSTDIR\gencode.exe" 0
  CreateShortCut "$SMPROGRAMS\GenCode\访问网站 (yamikeji.com).lnk" "http://www.yamikeji.com" "" "" 0
  CreateShortCut "$SMPROGRAMS\GenCode\卸载 GenCode.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; 删除开始菜单
  RMDir /r "$SMPROGRAMS\GenCode"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  DeleteRegKey HKCU "Software\Classes\Directory\shell\OpenInGenCode"
  DeleteRegKey HKCU "Software\Classes\Directory\Background\shell\OpenInGenCode"
  DeleteRegKey HKCU "Software\Classes\Drive\shell\OpenInGenCode"
!macroend
