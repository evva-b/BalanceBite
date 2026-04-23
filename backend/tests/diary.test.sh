#!/bin/bash
BASE_URL="http://localhost:3001"
COOKIE_FILE="cookies.txt"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_diary_${TIMESTAMP}@example.com"
TEST_PASS="password123"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "📔 ТЕСТИРОВАНИЕ ДНЕВНИКА ПИТАНИЯ"
echo "========================================="

# 🔑 Шаг 1: Регистрация
echo -e "\n🔑 Шаг 1: Регистрация..."
REG_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_FILE" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
REG_CODE=$(echo "$REG_RESPONSE" | tail -n1)
if [ "$REG_CODE" != "201" ] && [ "$REG_CODE" != "409" ]; then
  echo -e "${RED}❌ Ошибка регистрации${NC}"
  exit 1
fi
echo "✅ Регистрация успешна"

# 📦 Шаг 2: Создание продуктов
echo -e "\n📦 Шаг 2: Создание пользовательских продуктов..."
PROD1=$(curl -s -X POST "$BASE_URL/api/diary/custom-products" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"name":"Овсянка","calories_kcal":100,"proteins_g":3,"fats_g":1,"carbs_g":20}')
P1_ID=$(echo "$PROD1" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Создан продукт 1: $P1_ID"

PROD2=$(curl -s -X POST "$BASE_URL/api/diary/custom-products" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d '{"name":"Банан","calories_kcal":50,"proteins_g":1,"fats_g":0,"carbs_g":12}')
P2_ID=$(echo "$PROD2" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Создан продукт 2: $P2_ID"

# 🧪 ТЕСТ 1
echo -e "\n${YELLOW}🧪 ТЕСТ 1: GET /api/diary/custom-products${NC}"
curl -s -X GET "$BASE_URL/api/diary/custom-products" -b "$COOKIE_FILE" | grep -q '"success":true'
[ $? -eq 0 ] && echo -e "${GREEN}✅ ТЕСТ 1 ПРОЙДЕН${NC}" || echo -e "${RED}❌ ТЕСТ 1 НЕ ПРОЙДЕН${NC}"

# 📅 ТЕСТ 3: Завтрак
echo -e "\n${YELLOW}📅 ТЕСТ 3: POST /api/diary/meals (завтрак)${NC}"
MEAL1=$(curl -s -X POST "$BASE_URL/api/diary/meals" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"date\":\"2026-04-21\",\"meal_time\":\"08:00:00\",\"meal_name\":\"Завтрак\",\"entries\":[{\"custom_product_id\":\"$P1_ID\",\"quantity_g\":200},{\"custom_product_id\":\"$P2_ID\",\"quantity_g\":100}]}")
M1_ID=$(echo "$MEAL1" | grep -o '"meal_id":"[^"]*"' | cut -d'"' -f4)

echo "$MEAL1" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ ТЕСТ 3 ПРОЙДЕН${NC}"
  echo "   Meal ID: $M1_ID"
else
  echo -e "${RED}❌ ТЕСТ 3 НЕ ПРОЙДЕН${NC}"
  echo "$MEAL1"
fi

# 📅 ТЕСТ 4: Ручной ввод
echo -e "\n${YELLOW}📅 ТЕСТ 4: POST /api/diary/meals (ручной ввод)${NC}"
MEAL2=$(curl -s -X POST "$BASE_URL/api/diary/meals" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"date\":\"2026-04-21\",\"meal_time\":\"13:00:00\",\"meal_name\":\"Обед\",\"entries\":[{\"quantity_g\":1,\"manual_data\":{\"calories\":300,\"proteins\":30,\"fats\":10,\"carbs\":20}}]}")
M2_ID=$(echo "$MEAL2" | grep -o '"meal_id":"[^"]*"' | cut -d'"' -f4)

echo "$MEAL2" | grep -q '"success":true'
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ ТЕСТ 4 ПРОЙДЕН${NC}"
  echo "   Meal ID: $M2_ID"
else
  echo -e "${RED}❌ ТЕСТ 4 НЕ ПРОЙДЕН${NC}"
  echo "$MEAL2"
fi

# 📊 ТЕСТ 5: Дневник
echo -e "\n${YELLOW}📊 ТЕСТ 5: GET /api/diary/meals?date=2026-04-21${NC}"
DIARY=$(curl -s -X GET "$BASE_URL/api/diary/meals?date=2026-04-21" -b "$COOKIE_FILE")
echo "$DIARY" | grep -q '"success":true'
[ $? -eq 0 ] && echo -e "${GREEN}✅ ТЕСТ 5 ПРОЙДЕН${NC}" || echo -e "${RED}❌ ТЕСТ 5 НЕ ПРОЙДЕН${NC}"

# ❌ ТЕСТ 6: Дата
echo -e "\n${YELLOW}❌ ТЕСТ 6: Неверная дата${NC}"
curl -s -X GET "$BASE_URL/api/diary/meals?date=invalid" -b "$COOKIE_FILE" | grep -q '"error"'
[ $? -eq 0 ] && echo -e "${GREEN}✅ ТЕСТ 6 ПРОЙДЕН${NC}" || echo -e "${RED}❌ ТЕСТ 6 НЕ ПРОЙДЕН${NC}"

# ❌ ТЕСТ 7: Quantity
echo -e "\n${YELLOW}❌ ТЕСТ 7: Quantity <= 0${NC}"
curl -s -X POST "$BASE_URL/api/diary/meals" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_FILE" \
  -d "{\"date\":\"2026-04-21\",\"meal_time\":\"12:00\",\"meal_name\":\"Тест\",\"entries\":[{\"custom_product_id\":\"$P1_ID\",\"quantity_g\":0}]}" | grep -q '"error"'
[ $? -eq 0 ] && echo -e "${GREEN}✅ ТЕСТ 7 ПРОЙДЕН${NC}" || echo -e "${RED}❌ ТЕСТ 7 НЕ ПРОЙДЕН${NC}"

# 🗑️ ТЕСТ 8: Удаление записи
echo -e "\n${YELLOW}🗑️  ТЕСТ 8: DELETE Entry${NC}"
ENTRY_ID=$(echo "$DIARY" | grep -o '"entry_id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ENTRY_ID" ] && [ -n "$M1_ID" ]; then
  curl -s -X DELETE "$BASE_URL/api/diary/meals/$M1_ID/entries/$ENTRY_ID" -b "$COOKIE_FILE" | grep -q '"success":true'
  [ $? -eq 0 ] && echo -e "${GREEN}✅ ТЕСТ 8 ПРОЙДЕН${NC}" || echo -e "${RED}❌ ТЕСТ 8 НЕ ПРОЙДЕН${NC}"
else
  echo -e "${YELLOW}⚠️  ТЕСТ 8 ПРОПУЩЕН (нет данных для удаления)${NC}"
fi

# 🗑️ ТЕСТ 9: Удаление приёма
echo -e "\n${YELLOW}🗑️  ТЕСТ 9: DELETE Meal${NC}"
if [ -n "$M2_ID" ]; then
  DEL=$(curl -s -X DELETE "$BASE_URL/api/diary/meals/$M2_ID" -b "$COOKIE_FILE")
  echo "$DEL" | grep -q '"success":true'
  [ $? -eq 0 ] && echo -e "${GREEN}✅ ТЕСТ 9 ПРОЙДЕН${NC}" || echo -e "${RED}❌ ТЕСТ 9 НЕ ПРОЙДЕН${NC}"
else
  echo -e "${YELLOW}⚠️  ТЕСТ 9 ПРОПУЩЕН (M2_ID пустой)${NC}"
fi

echo -e "\n========================================="
echo "🏁 Тестирование завершено"
echo "========================================="