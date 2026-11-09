@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск бэкенда SysAdmin Helpdesk (FastAPI)
echo  Сервер доступен по адресу: http://localhost:8000
echo  В локальной сети (для телефонов): http://192.168.1.161:8000
echo ====================================================
cd /d "%~dp0backend"
call venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
