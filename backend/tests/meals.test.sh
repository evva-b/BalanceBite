#!/bin/bash
BASE_URL="http://localhost:3001"
COOKIE_FILE="cookies.txt"
TIMESTAMP=$(date +%s%N)
TEST_EMAIL="test_meals_${TIMESTAMP}@example.com"
TEST_PASS="password123"

# 🔥 ЗАМЕНИ НА РЕАЛЬНЫЙ UUID ИЗ ТВОЕЙ БД!
PRODUCT_ID="09963a46-7100-4e6a-8a50-bdce27e2c106"

echo "🔑 Регистрация..."
curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" > /dev/null

echo -e "\n✅ ТЕСТ 1: Добавить завтрак (08:00)"
curl -s -X POST "$BASE_URL/api/meals/add" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"date\": \"2026-04-21\",
    \"meal_time\": \"08:00:00\",
    \"meal_name\": \"Завтрак\",
    \"products\": [{\"product_id\": \"$PRODUCT_ID\", \"quantity_g\": 150}]
  }"

echo -e "\n\n❌ ТЕСТ 2: FR-306 - quantity = 0"
curl -s -X POST "$BASE_URL/api/meals/add" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{
    \"date\": \"2026-04-21\",
    \"meal_time\": \"13:00:00\",
    \"meal_name\": \"Обед\",
    \"products\": [{\"product_id\": \"$PRODUCT_ID\", \"quantity_g\": 0}]
  }"

echo -e "\n\n✅ ТЕСТ 3: Сводка за день"
curl -s -X GET "$BASE_URL/api/meals/summary?date=2026-04-21" -b "$COOKIE_FILE"

echo -e "\n\n✅ ТЕСТ 4: Сводка за сегодня"
curl -s -X GET "$BASE_URL/api/meals/summary" -b "$COOKIE_FILE"

echo -e "\n\n❌ ТЕСТ 5: Неверный формат даты"
curl -s -X GET "$BASE_URL/api/meals/summary?date=invalid" -b "$COOKIE_FILE"

echo -e "\n\n✅ ТЕСТ 6: Список записей"
curl -s -X GET "$BASE_URL/api/meals/entries?date=2026-04-21" -b "$COOKIE_FILE"

echo -e "\n\n❌ ТЕСТ 7: Без авторизации"
curl -s -X GET "$BASE_URL/api/meals/summary"

echo -e "\n\n🏁 Все тесты завершены!"