@echo off
echo Switching to Firefox manifest...
copy manifest.json manifest.chrome.json >nul
copy manifest.firefox.json manifest.json >nul
echo Done! Load the extension in Firefox using about:debugging
echo Run use-chrome.bat to switch back.
