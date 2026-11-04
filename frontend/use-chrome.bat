@echo off
echo Switching to Chrome manifest...
rem Save edits to the active manifest, but only back to the Firefox copy if it IS
rem the Firefox version (it has no "service_worker").
if exist manifest.json (
  findstr /c:"service_worker" manifest.json >nul
  if errorlevel 1 copy manifest.json manifest.firefox.json >nul
)
copy manifest.chrome.json manifest.json >nul
echo Done! Load the extension in Chrome using chrome://extensions
echo Run use-firefox.bat to switch to Firefox manifest.
