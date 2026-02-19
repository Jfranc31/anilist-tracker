@echo off
echo Switching to Chrome manifest...
copy manifest.chrome.json manifest.json >nul
echo Done! Load the extension in Chrome using chrome://extensions
echo Run use-firefox.bat to switch to Firefox manifest.
