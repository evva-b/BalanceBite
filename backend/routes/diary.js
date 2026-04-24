const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

// ============================================================================
// 📅 POST /api/diary/meals - Добавить приём пищи (ОБЩИЙ ДЛЯ ВСЕХ)
// ============================================================================
router.post('/meals', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    // ЭТОТ ЛОГ ПОЯВИТСЯ В ТЕРМИНАЛЕ VS CODE
    console.log('>>>>>>>>>>> ЗАПРОС ПРИШЕЛ! <<<<<<<<<<<');
    console.log('ДАННЫЕ:', req.body);

    const { date, meal_time, meal_name, entries, product_id, quantity_g } = req.body;

    // 1. ОПРЕДЕЛЯЕМ ДАТУ (Берем из body или сегодня)
    let finalDate = date;
    if (finalDate && finalDate.includes('T')) finalDate = finalDate.split('T')[0];
    if (!finalDate) finalDate = new Date().toISOString().split('T')[0];

    const finalTime = meal_time || '12:00:00';
    const finalName = meal_name || 'Приём пищи';

    // 2. ФОРМИРУЕМ СПИСОК ПРОДУКТОВ
    let finalEntries = [];
    if (Array.isArray(entries)) {
      finalEntries = entries;
    } else if (product_id) {
      // Если пришел одиночный продукт из базы
      finalEntries = [{ product_id, quantity_g }];
    }

    if (finalEntries.length === 0) {
      return res.status(400).json({ error: 'Нет данных о продуктах' });
    }

    await client.query('BEGIN');

    // 3. СОЗДАЕМ ЗАГОЛОВОК
    const mealRes = await client.query(
      `INSERT INTO meals (user_id, date, meal_time, meal_name)
             VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, finalDate, finalTime, finalName],
    );
    const mealId = mealRes.rows[0].id;

    // 4. ДОБАВЛЯЕМ ПРОДУКТЫ
    for (const entry of finalEntries) {
      let pName = '',
        cal = 0,
        prot = 0,
        fat = 0,
        carb = 0;

      if (entry.product_id) {
        const p = await client.query('SELECT * FROM products WHERE id = $1', [entry.product_id]);
        if (p.rows.length > 0) {
          const prod = p.rows[0];
          pName = prod.name;
          const f = (parseFloat(entry.quantity_g) || 100) / 100;
          cal = (prod.calories_kcal || 0) * f;
          prot = (prod.proteins_g || 0) * f;
          fat = (prod.fats_g || 0) * f;
          carb = (prod.carbs_g || 0) * f;
        }
      } else {
        pName = entry.product_name || 'Продукт';
        const m = entry.manual_data || {};
        cal = m.calories || 0;
        prot = m.proteins || 0;
        fat = m.fats || 0;
        carb = m.carbs || 0;
      }

      await client.query(
        `INSERT INTO meal_entries 
                (meal_id, product_id, product_name, quantity_g, calories_kcal, proteins_g, fats_g, carbs_g)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [mealId, entry.product_id || null, pName, entry.quantity_g || 100, cal, prot, fat, carb],
      );
    }

    await client.query('COMMIT');
    console.log(`✅ УСПЕШНО СОХРАНЕНО НА ДАТУ: ${finalDate}`);
    res.status(201).json({ success: true, message: 'Добавлено!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ОШИБКА:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ============================================================================
// 📅 GET /api/diary/meals - Получить дневник (ДЛЯ ОТОБРАЖЕНИЯ)
// ============================================================================
router.get('/meals', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    const meals = await pool.query(
      `SELECT * FROM meals WHERE user_id = $1 AND date = $2 ORDER BY meal_time`,
      [req.user.id, date],
    );

    if (meals.rows.length === 0) return res.json({ success: true, data: [] });

    const ids = meals.rows.map((m) => m.id);
    const entries = await pool.query(
      `SELECT me.*, p.name as original_name 
             FROM meal_entries me 
             LEFT JOIN products p ON me.product_id = p.id 
             WHERE me.meal_id = ANY($1::uuid[])`,
      [ids],
    );

    const data = meals.rows.map((m) => ({
      ...m,
      entries: entries.rows
        .filter((e) => e.meal_id === m.id)
        .map((e) => ({
          entry_id: e.id,
          product_name: e.product_name || e.original_name,
          quantity_g: e.quantity_g,
          calories: e.calories_kcal,
          proteins: e.proteins_g,
          fats: e.fats_g,
          carbs: e.carbs_g,
        })),
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 🗑️ DELETE /api/diary/meals/entry/:id
// ============================================================================
router.delete('/meals/entry/:id', authenticate, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM meal_entries WHERE id = $1 AND meal_id IN (SELECT id FROM meals WHERE user_id = $2)`,
      [req.params.id, req.user.id],
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
