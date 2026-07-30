Option Explicit

Dim fso, scriptDir, repoRoot, backendDir, backendLog, backendErrLog
Dim shellApp, wmiService, startupConfig, processClass, command, processId, createResult

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)
backendDir = fso.BuildPath(repoRoot, "backend")
backendLog = fso.BuildPath(backendDir, "backend.log")
backendErrLog = fso.BuildPath(backendDir, "backend_err.log")

command = "cmd.exe /c cd /d """ & backendDir & """ && node server.js >> """ & backendLog & """ 2>> """ & backendErrLog & """"

Set wmiService = GetObject("winmgmts:\\.\root\cimv2")
Set startupConfig = wmiService.Get("Win32_ProcessStartup").SpawnInstance_
startupConfig.ShowWindow = 0

Set processClass = wmiService.Get("Win32_Process")
createResult = processClass.Create(command, Null, startupConfig, processId)

If createResult <> 0 Then
    WScript.Quit createResult
End If
