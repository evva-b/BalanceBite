const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

// ============================================================================
// 📦 CUSTOM PRODUCTS
// ============================================================================
router.get('/custom-products', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, calories_kcal, proteins_g, fats_g, carbs_g, is_favorite FROM custom_products WHERE user_id = $1',
      [req.user.id],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('❌ GET /custom-products error:', err.message);
    res.status(500).json({ error: 'Ошибка загрузки продуктов' });
  }
});

router.post('/custom-products', authenticate, async (req, res) => {
  try {
    const { name, calories_kcal, proteins_g, fats_g, carbs_g, is_favorite } = req.body;
    if (!name || calories_kcal === undefined)
      return res.status(400).json({ error: 'Название и калории обязательны' });

    const result = await pool.query(
      `INSERT INTO custom_products (user_id, name, calories_kcal, proteins_g, fats_g, carbs_g, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name`,
      [req.user.id, name, calories_kcal, proteins_g, fats_g, carbs_g, is_favorite || false],
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('❌ POST /custom-products error:', err.message);
    res.status(500).json({ error: 'Ошибка создания продукта' });
  }
});

// ============================================================================
// 📅 MEALS
// ============================================================================
router.post('/meals', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const { date, meal_time, meal_name, entries } = req.body;
    if (!date || !meal_time || !meal_name || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Неверные данные запроса' });
    }

    await client.query('BEGIN');

    // 1. Создаём приём пищи
    const mealRes = await client.query(
      `INSERT INTO meals (user_id, date, meal_time, meal_name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, date, meal_time, meal_name],
    );
    const mealId = mealRes.rows[0].id;

    let totalCalories = 0,
      totalProteins = 0,
      totalFats = 0,
      totalCarbs = 0;

    // 2. Добавляем записи
    for (const entry of entries) {
      const qty = parseFloat(entry.quantity_g);
      if (!qty || qty <= 0) {
        throw new Error(`Неверное количество продукта: ${entry.quantity_g}`);
      }

      let productId = null;
      let calories = 0,
        proteins = 0,
        fats = 0,
        carbs = 0;

      if (entry.product_id) {
        // Из базы (USDA)
        const p = await client.query('SELECT * FROM usda_products WHERE id = $1', [
          entry.product_id,
        ]);
        if (p.rows.length === 0) throw new Error('Продукт не найден');
        productId = entry.product_id;
        const factor = qty / 100;
        calories = p.rows[0].calories_kcal * factor;
        proteins = p.rows[0].proteins_g * factor;
        fats = p.rows[0].fats_g * factor;
        carbs = p.rows[0].carbs_g * factor;
      } else if (entry.custom_product_id) {
        // Пользовательский
        const p = await client.query('SELECT * FROM custom_products WHERE id = $1', [
          entry.custom_product_id,
        ]);
        if (p.rows.length === 0) throw new Error('Пользовательский продукт не найден');
        // ⚠️ БД не имеет custom_product_id, поэтому productId = NULL
        const factor = qty / 100;
        calories = p.rows[0].calories_kcal * factor;
        proteins = p.rows[0].proteins_g * factor;
        fats = p.rows[0].fats_g * factor;
        carbs = p.rows[0].carbs_g * factor;
      } else if (entry.manual_data) {
        // Ручной ввод
        calories = entry.manual_data.calories || 0;
        proteins = entry.manual_data.proteins || 0;
        fats = entry.manual_data.fats || 0;
        carbs = entry.manual_data.carbs || 0;
      } else {
        throw new Error('Не указан источник продукта');
      }

      // 🔥 Вставляем ТОЛЬКО существующие колонки meal_entries
      await client.query(
        `INSERT INTO meal_entries 
         (meal_id, product_id, quantity_g, calories_kcal, proteins_g, fats_g, carbs_g)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [mealId, productId, qty, calories, proteins, fats, carbs],
      );

      totalCalories += calories;
      totalProteins += proteins;
      totalFats += fats;
      totalCarbs += carbs;
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      meal_id: mealId,
      totals: {
        calories: Math.round(totalCalories * 10) / 10,
        proteins: Math.round(totalProteins * 10) / 10,
        fats: Math.round(totalFats * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('💥 POST /meals CRITICAL ERROR:', err.message, err.code);
    res.status(500).json({ error: 'Ошибка добавления приёма пищи' });
  } finally {
    client.release();
  }
});

router.get('/meals', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Неверный формат даты (YYYY-MM-DD)' });
    }

    const meals = await pool.query(
      `SELECT id, meal_time, meal_name FROM meals WHERE user_id = $1 AND date = $2 ORDER BY meal_time`,
      [req.user.id, date],
    );

    const mealIds = meals.rows.map((m) => m.id);
    let entries = [];
    if (mealIds.length > 0) {
      const entriesRes = await pool.query(
        `SELECT 
           me.id, me.meal_id, me.quantity_g, 
           me.calories_kcal, me.proteins_g, me.fats_g, me.carbs_g,
           p.name as product_name,
           CASE 
             WHEN me.product_id IS NOT NULL THEN 'base'
             ELSE 'custom_or_manual'
           END as source
         FROM meal_entries me
         LEFT JOIN usda_products p ON me.product_id = p.id
         WHERE me.meal_id = ANY($1::uuid[])`,
        [mealIds],
      );
      entries = entriesRes.rows;
    }

    const diary = meals.rows.map((meal) => ({
      ...meal,
      entries: entries
        .filter((e) => e.meal_id === meal.id)
        .map((e) => ({
          entry_id: e.id,
          quantity_g: e.quantity_g,
          calories: e.calories_kcal,
          proteins: e.proteins_g,
          fats: e.fats_g,
          carbs: e.carbs_g,
          product_name: e.product_name || 'Пользовательский/Ручной',
          source: e.source,
        })),
    }));

    res.json({ success: true, data: diary });
  } catch (err) {
    console.error('💥 GET /meals CRITICAL ERROR:', err.message);
    res.status(500).json({ error: 'Ошибка загрузки дневника' });
  }
});

router.delete('/meals/:mealId', authenticate, async (req, res) => {
  try {
    const { mealId } = req.params;
    const result = await pool.query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [
      mealId,
      req.user.id,
    ]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Приём пищи не найден' });
    res.json({ success: true, message: 'Удалено' });
  } catch (err) {
    console.error('DELETE /meals error:', err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

router.delete('/meals/:mealId/entries/:entryId', authenticate, async (req, res) => {
  try {
    const { mealId, entryId } = req.params;
    const check = await pool.query('SELECT 1 FROM meals WHERE id = $1 AND user_id = $2', [
      mealId,
      req.user.id,
    ]);
    if (check.rowCount === 0) return res.status(404).json({ error: 'Приём пищи не найден' });

    const result = await pool.query('DELETE FROM meal_entries WHERE id = $1', [entryId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ success: true, message: 'Запись удалена' });
  } catch (err) {
    console.error('DELETE entry error:', err);
    res.status(500).json({ error: 'Ошибка удаления' });
  }
});

module.exports = router;
