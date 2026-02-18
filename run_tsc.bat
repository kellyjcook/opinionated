@echo off
cd /d C:\Projects\opinionated
"C:\Program Files\nodejs\node.exe" node_modules\typescript\lib\tsc.js --noEmit > tsc_output.txt 2>&1
echo TSC_EXIT=%ERRORLEVEL% >> tsc_output.txt
