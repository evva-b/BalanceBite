#!/bin/bash
BASE_URL="http://localhost:3001"
COOKIE_FILE="cookies.txt"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASS="password123"

echo "🔑 Шаг 1: Регистрация или логин..."

# Пробуем зарегистрироваться
REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")

REG_CODE=$(echo "$REG_RESPONSE" | tail -n1)
REG_BODY=$(echo "$REG_RESPONSE" | sed '$d')

if [ "$REG_CODE" = "409" ]; then
  echo "⚠️ Пользователь уже существует, пробуем логин..."
  # Если 409 (Conflict) — делаем логин
  curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -c "$COOKIE_FILE" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"
elif [ "$REG_CODE" = "201" ] || [ "$REG_CODE" = "200" ]; then
  echo "✅ Регистрация успешна: $REG_BODY"
else
  echo "❌ Ошибка авторизации (код $REG_CODE): $REG_BODY"
  echo "💡 Проверь, запущен ли сервер на $BASE_URL"
  exit 1
fi

echo -e "\n────────────────────────────"
echo "✅ ТЕСТ 1: Успешное обновление профиля"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":175,"weight_kg":70.5,"age":25,"gender":"male","goal":"Поддержание веса"}'

echo -e "\n\n❌ ТЕСТ 2: Рост < 100 см"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":90,"weight_kg":70,"age":25}'

echo -e "\n\n❌ ТЕСТ 3: Вес > 250 кг"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":175,"weight_kg":300,"age":25}'

echo -e "\n\n❌ ТЕСТ 4: Возраст < 16 лет"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":175,"weight_kg":70,"age":15}'

echo -e "\n\n❌ ТЕСТ 5: Без авторизации"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -d '{"height_cm":175,"weight_kg":70,"age":25}'

echo -e "\n\n🏁 Все тесты завершены!"