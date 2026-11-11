#!/usr/bin/env bash
# Скрипт автоматического развертывания IT Service Desk на VPS сервере (Ubuntu / Debian)
# Запуск: chmod +x deploy-vps.sh && ./deploy-vps.sh

set -e

echo "==================================================================="
echo "       Развертывание IT Service Desk на сервере (Без VPN)"
echo "==================================================================="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "[*] Установка Docker и Docker Compose..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
fi

# Проверка .env файла
if [ ! -f .env ]; then
    echo ""
    read -p "Введите ваш домен (например, support.company.ru или оставьте пустым для IP): " USER_DOMAIN
    if [ -z "$USER_DOMAIN" ]; then
        USER_DOMAIN="localhost"
    fi
    
    read -p "Задайте PIN-код для входа сисадмина [по умолчанию 1234]: " USER_PIN
    if [ -z "$USER_PIN" ]; then
        USER_PIN="1234"
    fi

    echo "DOMAIN=$USER_DOMAIN" > .env
    echo "ADMIN_PIN=$USER_PIN" >> .env
    echo "[+] Файл конфигурации .env успешно создан."
fi

# Создание директорий для данных
mkdir -p data/uploads data/caddy_data

echo "[*] Запуск контейнеров в фоновом режиме..."
docker compose down || true
docker compose up -d --build

echo ""
echo "==================================================================="
echo " [OK] IT Service Desk успешно развернут и работает 24/7!"
echo ""
echo " Адрес веб-приложения: https://$(grep DOMAIN .env | cut -d '=' -f2)"
echo " Вход в панель сисадмина: PIN $(grep ADMIN_PIN .env | cut -d '=' -f2)"
echo "==================================================================="
