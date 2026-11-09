@echo off
chcp 65001 > nul
echo ====================================================
echo  Запуск мобильного приложения SysAdmin Helpdesk (Expo)
echo  Для запуска на телефоне: установите приложение Expo Go
echo  и отсканируйте QR-код камерой (iOS) или в Expo Go (Android).
echo  Для запуска в браузере: нажмите 'w' после старта.
echo ====================================================
cd /d "%~dp0mobile-app"
call npx expo start
pause
