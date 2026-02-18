@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d C:\Projects\opinionated
call node_modules\.bin\vite.cmd --host
