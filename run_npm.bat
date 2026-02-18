@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Projects\opinionated
call "C:\Program Files\nodejs\npm.cmd" install
echo EXIT_CODE=%ERRORLEVEL%
