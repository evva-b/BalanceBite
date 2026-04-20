#!/bin/bash
BASE_URL="http://localhost:3001"
COOKIE_FILE="cookies.txt"
TIMESTAMP=$(date +%s%N)  # Наносекунды для уникальности
TEST_EMAIL="test_cal_${TIMESTAMP}@example.com"
TEST_PASS="password123"

echo "🔑 Шаг 1: Регистрация (уникальный email)..."
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"

echo -e "\n\n✅ Шаг 2: Создаём профиль"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":175,"weight_kg":70,"age":25,"gender":"male","goal":"Поддержание веса"}'

echo -e "\n\n✅ ТЕСТ 1: Норма калорий (базовый)"
curl -s -X GET "$BASE_URL/api/profile/calories" -b "$COOKIE_FILE"

echo -e "\n\n✅ ТЕСТ 2: С активностью 1.55"
curl -s -X GET "$BASE_URL/api/profile/calories?activityLevel=1.55" -b "$COOKIE_FILE"

echo -e "\n\n✅ ТЕСТ 3: Детальная расшифровка"
curl -s -X GET "$BASE_URL/api/profile/calories/breakdown" -b "$COOKIE_FILE"

echo -e "\n\n❌ ТЕСТ 4: Без авторизации"
curl -s -X GET "$BASE_URL/api/profile/calories"

echo -e "\n\n📊 ТЕСТ 5: Цель 'Снижение веса'"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"goal":"weight_loss"}'

curl -s -X GET "$BASE_URL/api/profile/calories" -b "$COOKIE_FILE"

echo -e "\n\n📊 ТЕСТ 6: Цель 'Набор массы' + активность 1.725"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"goal":"muscle_gain"}'

curl -s -X GET "$BASE_URL/api/profile/calories?activityLevel=1.725" -b "$COOKIE_FILE"

echo -e "\n\n❌ ТЕСТ 7: Неполный профиль (новый пользователь)"
# Используем ещё один уникальный email
INCOMPLETE_EMAIL="test_incomplete_${TIMESTAMP}@example.com"

curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c "${COOKIE_FILE}.tmp" \
  -d "{\"email\":\"$INCOMPLETE_EMAIL\",\"password\":\"$TEST_PASS\"}" > /dev/null

curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}.tmp" \
  -d '{"height_cm":170,"weight_kg":65,"gender":"female"}' > /dev/null

curl -s -X GET "$BASE_URL/api/profile/calories" -b "${COOKIE_FILE}.tmp"

# Чистим временный файл
rm -f "${COOKIE_FILE}.tmp"

echo -e "\n\n🏁 Все тесты FR-205 завершены!"