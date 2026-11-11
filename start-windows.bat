@echo off
chcp 65001 > nul
title IT Service Desk — Запуск сервера

echo ===================================================================
echo               IT SERVICE DESK — СИСТЕМА ЗАЯВОК ДЛЯ СИСАДМИНА
echo ===================================================================
echo.

cd /d "%~dp0backend"

if not exist "venv\Scripts\python.exe" (
    echo [!] Виртуальное окружение venv не найдено. Создаем...
    python -m venv venv
    call venv\Scripts\python.exe -m pip install -r requirements.txt
)

echo [*] Определение IP-адреса в локальной сети...
for /f "tokens=*" %%a in ('powershell -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*vEthernet*' } | Select-Object -First 1).IPAddress"') do set LOCAL_IP=%%a

echo.
echo ===================================================================
echo  [+] СЕРВЕР ЗАПУСКАЕТСЯ!
echo.
echo  - Локально на этом ПК:        http://localhost:8000
if defined LOCAL_IP (
echo  - Для сотрудников и телефонов: http://%LOCAL_IP%:8000
)
echo.
echo  Для входа в панель сисадмина нажмите кнопку в шапке (PIN: 1234)
echo ===================================================================
echo.

call venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
