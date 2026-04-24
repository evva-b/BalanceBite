#!/bin/bash
BASE_URL="http://localhost:3001"
COOKIE_FILE="$(pwd)/cookies.txt"
TEST_EMAIL="test_prod_$(date +%s)@example.com"
TEST_PASS="TestPass123!"
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo "========================================="
echo "📦 ТЕСТЫ БАЗЫ ПРОДУКТОВ"
echo "========================================="

# 🔐 Авторизация
echo -e "${YELLOW}🔐 Авторизация...${NC}"
LOGIN=$(curl -s -w "\n%{http_code}" -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}")
HTTP_CODE=$(echo "$LOGIN" | tail -n1)
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
  curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" > /dev/null
  curl -s -c "$COOKIE_FILE" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" > /dev/null
fi
grep -q "session_id" "$COOKIE_FILE" 2>/dev/null && echo -e "${GREEN}✅ Авторизация успешна${NC}" || { echo -e "${RED}❌ Ошибка авторизации${NC}"; exit 1; }

# 🔍 ТЕСТ 1: Поиск
echo -e "\n${YELLOW}🔍 ТЕСТ 1: Поиск продуктов${NC}"
SEARCH=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/products?page=1&limit=14&sortBy=name&order=asc")
if echo "$SEARCH" | grep -q '"success":true'; then
  COUNT=$(echo "$SEARCH" | grep -o '"id"' | wc -l | tr -d ' ')
  echo -e "${GREEN}✅ ТЕСТ 1 ПРОЙДЕН${NC}"; echo "   📦 Найдено: $COUNT"
  PID=$(echo "$SEARCH" | grep -oE '"id":"[0-9a-f-]{36}"' | head -1 | grep -oE '[0-9a-f-]{36}')
  [ -n "$PID" ] && echo "   🆔 ID: $PID" && echo "$PID" > /tmp/pid.txt
else
  echo -e "${RED}❌ ТЕСТ 1 НЕ ПРОЙДЕН${NC}"; echo "$SEARCH" | head -c 300
fi

# ➕ ТЕСТ 2: Добавить в дневник
echo -e "\n${YELLOW}➕ ТЕСТ 2: Добавить продукт в дневник${NC}"
if [ -f /tmp/pid.txt ] && [ -s /tmp/pid.txt ]; then
  PID=$(cat /tmp/pid.txt); echo "   🆔 Продукт: $PID"
  ADD=$(curl -s -X POST "$BASE_URL/api/products/$PID/add-to-diary" \
    -H "Content-Type: application/json" -b "$COOKIE_FILE" -d '{"quantity_g":150}')
  if echo "$ADD" | grep -q '"success":true'; then
    MSG=$(echo "$ADD" | sed -n 's/.*"message":"\([^"]*\)".*/\1/p')
    echo -e "${GREEN}✅ ТЕСТ 2 ПРОЙДЕН${NC}"; echo "   📝 $MSG"
  else
    echo -e "${RED}❌ ТЕСТ 2 НЕ ПРОЙДЕН${NC}"; echo "   Ответ: $ADD"
  fi
else
  echo -e "${YELLOW}⚠️  ТЕСТ 2 ПРОПУЩЕН: Нет product_id${NC}"
fi

# 🔍 ТЕСТ 3: Детали продукта
echo -e "\n${YELLOW}🔍 ТЕСТ 3: Получить детали продукта${NC}"
if [ -f /tmp/pid.txt ] && [ -s /tmp/pid.txt ]; then
  PID=$(cat /tmp/pid.txt)
  DETAILS=$(curl -s -b "$COOKIE_FILE" "$BASE_URL/api/products/$PID")
  if echo "$DETAILS" | grep -q '"success":true'; then
    NAME=$(echo "$DETAILS" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')
    echo -e "${GREEN}✅ ТЕСТ 3 ПРОЙДЕН${NC}"; echo "   📦 $NAME"
  else
    echo -e "${RED}❌ ТЕСТ 3 НЕ ПРОЙДЕН${NC}"; echo "$DETAILS" | head -c 300
  fi
fi

rm -f /tmp/pid.txt
echo -e "\n=========================================\n🏁 Готово\n========================================="