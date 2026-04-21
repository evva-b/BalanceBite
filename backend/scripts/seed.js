const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'balancebite',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

const productsPath = path.join(__dirname, 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

async function seed() {
  let client;
  try {
    console.log('🌱 Запуск сидирования базы данных...');

    // Проверяем подключение
    await pool.query('SELECT NOW()');
    console.log('✅ Подключение к БД успешно');

    client = await pool.connect();

    // 🔥 Вариант 1: Вставляем только новые продукты (без удаления старых)
    // Используем ON CONFLICT DO NOTHING чтобы избежать дублей
    console.log('📝 Вставка продуктов...');

    const placeholders = [];
    const values = [];

    let index = 1;
    products.forEach((product) => {
      // 🔥 Используем правильные имена колонок из твоей схемы
      placeholders.push(
        `(uuid_generate_v4(), $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`,
      );
      values.push(
        product.name,
        product.calories, // calories_kcal
        product.proteins, // proteins_g
        product.fats, // fats_g
        product.carbs, // carbs_g
        false, // is_custom (false для системных продуктов)
        null, // user_id (null для системных продуктов)
      );
    });

    const query = `
      INSERT INTO products (id, name, calories_kcal, proteins_g, fats_g, carbs_g, is_custom, user_id)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT DO NOTHING
      RETURNING id, name;
    `;

    const result = await client.query(query, values);
    console.log(`✅ Успешно добавлено ${result.rows.length} новых продуктов:`);
    result.rows.forEach((row) => console.log(`   - ${row.name}`));

    if (result.rows.length === 0) {
      console.log('ℹ️  Продукты уже существуют в базе (ничего не добавлено)');
    }
  } catch (error) {
    console.error('❌ Ошибка при сидировании:', error.message);

    if (error.message.includes('foreign key')) {
      console.error('\n💡 Проблема: есть записи в meal_entries, ссылающиеся на продукты.');
      console.error('   Решение: скрипт теперь не удаляет старые продукты, а добавляет новые.');
    }

    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

seed();
