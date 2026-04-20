; ============================================================================
; Verde NSIS installer hooks
; Registers "Open with Verde" right-click menu for .xlsm files.
;
; Scope: HKCU (per-user). The PLANS.md §6 specifies HKCR, but HKCR requires
; admin privileges. Since installMode is "currentUser", we write under
; HKCU\Software\Classes (which merges into HKCR for the current user).
; If we later switch to installMode: "both", migrate these writes to HKLM.
; ============================================================================

!include "x64.nsh"

!macro NSIS_HOOK_POSTINSTALL
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}

  ; .xlsm association — explicit file extension route
  WriteRegStr HKCU "Software\Classes\.xlsm\shell\Verde" "" "Open with Verde"
  WriteRegStr HKCU "Software\Classes\.xlsm\shell\Verde" "Icon" '"$INSTDIR\verde.exe",0'
  ; %1 is the clicked file path. If Tauri's build escapes %, change to %%1.
  WriteRegStr HKCU "Software\Classes\.xlsm\shell\Verde\command" "" '"$INSTDIR\verde.exe" "%1"'

  ; Excel.SheetMacroEnabled.12 — OLE ProgID route (covers xlsm via Office registration)
  WriteRegStr HKCU "Software\Classes\Excel.SheetMacroEnabled.12\shell\Verde" "" "Open with Verde"
  WriteRegStr HKCU "Software\Classes\Excel.SheetMacroEnabled.12\shell\Verde" "Icon" '"$INSTDIR\verde.exe",0'
  ; %1 is the clicked file path. If Tauri's build escapes %, change to %%1.
  WriteRegStr HKCU "Software\Classes\Excel.SheetMacroEnabled.12\shell\Verde\command" "" '"$INSTDIR\verde.exe" "%1"'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ${If} ${RunningX64}
    SetRegView 64
  ${EndIf}

  DeleteRegKey HKCU "Software\Classes\.xlsm\shell\Verde"
  DeleteRegKey HKCU "Software\Classes\Excel.SheetMacroEnabled.12\shell\Verde"
!macroend
