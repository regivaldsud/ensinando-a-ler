@echo off
rem Abre o "Ensinando a Ler" no navegador (Chrome ou Edge).
rem Usa um servidor local para o microfone e as vozes naturais funcionarem bem.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 goto semservidor
start "Ensinando a Ler - servidor (nao feche)" /min python -m http.server 8790 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "http://localhost:8790/"
goto fim
:semservidor
start "" "%~dp0index.html"
:fim
