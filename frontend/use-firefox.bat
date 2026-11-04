@echo off
echo Switching to Firefox manifest...
rem Save edits to the active manifest, but only back to the Chrome copy if it IS
rem the Chrome version (only Chrome's has "service_worker"). Running this twice
rem used to overwrite manifest.chrome.json with the Firefox manifest.
if exist manifest.json (
  findstr /c:"service_worker" manifest.json >nul
  if not errorlevel 1 copy manifest.json manifest.chrome.json >nul
)
copy manifest.firefox.json manifest.json >nul
echo Done! Load the extension in Firefox using about:debugging
echo Run use-chrome.bat to switch back.
