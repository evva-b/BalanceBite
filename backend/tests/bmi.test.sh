#!/bin/bash
BASE_URL="http://localhost:3001"
COOKIE_FILE="cookies.txt"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_bmi_${TIMESTAMP}@example.com"
TEST_PASS="password123"

echo "🔑 Шаг 1: Регистрация..."
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}"

echo -e "\n\n✅ Шаг 2: Создаём профиль с данными"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":175,"weight_kg":70,"age":25,"gender":"male","goal":"Поддержание веса"}'

echo -e "\n\n✅ ТЕСТ 1: Получить ИМТ (GET /api/profile/bmi)"
curl -s -X GET "$BASE_URL/api/profile/bmi" \
  -b "$COOKIE_FILE"

echo -e "\n\n✅ ТЕСТ 2: Получить все метрики (GET /api/profile/metrics)"
curl -s -X GET "$BASE_URL/api/profile/metrics" \
  -b "$COOKIE_FILE"

echo -e "\n\n❌ ТЕСТ 3: ИМТ без авторизации"
curl -s -X GET "$BASE_URL/api/profile/bmi"

echo -e "\n\n📊 ТЕСТ 4: Обновляем профиль (другие данные)"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":160,"weight_kg":90,"age":30}'

echo -e "\n\n✅ ТЕСТ 5: ИМТ после обновления (ожирение)"
curl -s -X GET "$BASE_URL/api/profile/bmi" \
  -b "$COOKIE_FILE"

echo -e "\n\n📊 ТЕСТ 6: Обновляем на дефицит веса"
curl -s -X PUT "$BASE_URL/api/profile" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"height_cm":180,"weight_kg":50}'

echo -e "\n\n✅ ТЕСТ 7: ИМТ с дефицитом веса"
curl -s -X GET "$BASE_URL/api/profile/bmi" \
  -b "$COOKIE_FILE"

echo -e "\n\n✅ ТЕСТ 8: Все метрики с ИМТ"
curl -s -X GET "$BASE_URL/api/profile/metrics" \
  -b "$COOKIE_FILE"

echo -e "\n\n🏁 Все тесты FR-202 завершены!"