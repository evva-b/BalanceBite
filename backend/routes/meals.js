const express = require('express');
const pool = require('../db');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');

// ============================================================================
// POST /api/meals/add - Добавить приём пищи (FR-301, FR-304, FR-306)
// ============================================================================
router.post('/add', authenticate, async (req, res) => {
  try {
    const { date, meal_time, meal_name, products } = req.body;
    // products: [{ product_id, quantity_g }]

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать хотя бы один продукт' });
    }

    // Создаём запись приёма пищи
    const meal = await pool.query(
      'INSERT INTO meals (user_id, date, meal_time, meal_name) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, date, meal_time, meal_name],
    );
    const mealId = meal.rows[0].id;

    let dayTotals = { c: 0, p: 0, f: 0, u: 0 };

    for (const item of products) {
      // 🔥 FR-306: Проверка количества > 0
      if (!item.quantity_g || item.quantity_g <= 0) {
        return res.status(400).json({
          error: 'Количество продукта должно быть больше 0',
          field: 'quantity_g',
          fr: 'FR-306',
        });
      }

      const prod = await pool.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      if (prod.rows.length === 0) return res.status(404).json({ error: 'Продукт не найден' });

      const factor = item.quantity_g / 100;
      const c = prod.rows[0].calories_kcal * factor;
      const p = prod.rows[0].proteins_g * factor;
      const f = prod.rows[0].fats_g * factor;
      const u = prod.rows[0].carbs_g * factor;

      await pool.query(
        'INSERT INTO meal_entries (meal_id, product_id, quantity_g, calories_kcal, proteins_g, fats_g, carbs_g) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [mealId, item.product_id, item.quantity_g, c, p, f, u],
      );

      dayTotals.c += c;
      dayTotals.p += p;
      dayTotals.f += f;
      dayTotals.u += u;
    }

    res.status(201).json({
      message: 'Приём пищи добавлен',
      meal_id: mealId,
      totals: {
        calories: Math.round(dayTotals.c * 10) / 10,
        proteins: Math.round(dayTotals.p * 10) / 10,
        fats: Math.round(dayTotals.f * 10) / 10,
        carbs: Math.round(dayTotals.u * 10) / 10,
      },
    });
  } catch (err) {
    console.error('💥 POST /api/meals/add ERROR:', {
      message: err.message,
      code: err.code, // например: '23503' = foreign key violation
      detail: err.detail, // подробности от PostgreSQL
      hint: err.hint,
    });
    res.status(500).json({
      error: 'Ошибка сохранения приёма пищи',
      debug: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ============================================================================
// 🔥 GET /api/meals/summary - Сводка КБЖУ за день (FR-304)
// ============================================================================
router.get('/summary', authenticate, async (req, res) => {
  try {
    // Если дата не передана → берём сегодня
    let dateStr = req.query.date;

    if (!dateStr) {
      // Формируем сегодняшнюю дату в формате YYYY-MM-DD
      dateStr = new Date().toISOString().split('T')[0];
    }

    // Валидация формата даты
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат даты. Используйте YYYY-MM-DD',
      });
    }

    // 🔥 Агрегируем КБЖУ из meal_entries за указанный день
    // Поскольку мы уже храним рассчитанные значения, запрос очень простой
    const query = `
      SELECT 
        COALESCE(SUM(me.calories_kcal), 0) as calories,
        COALESCE(SUM(me.proteins_g), 0) as proteins,
        COALESCE(SUM(me.fats_g), 0) as fats,
        COALESCE(SUM(me.carbs_g), 0) as carbs
      FROM meal_entries me
      JOIN meals m ON me.meal_id = m.id
      WHERE m.user_id = $1 AND m.date = $2
    `;

    const result = await pool.query(query, [req.user.id, dateStr]);
    const totals = result.rows[0];

    // Округляем до 1 знака после запятой
    const rounded = {
      calories: Math.round(totals.calories * 10) / 10,
      proteins: Math.round(totals.proteins * 10) / 10,
      fats: Math.round(totals.fats * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
    };

    res.json({
      success: true,
      date: dateStr,
      rounded,
    });
  } catch (err) {
    console.error('GET /api/meals/summary error:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения сводки КБЖУ',
    });
  }
});

// ============================================================================
// 🔥 БОНУС: GET /api/meals/entries - Список приёмов пищи за день
// ============================================================================
router.get('/entries', authenticate, async (req, res) => {
  try {
    let dateStr = req.query.date || new Date().toISOString().split('T')[0];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Неверный формат даты' });
    }

    // 🔥 Убран p.category из запроса
    const query = `
      SELECT 
        m.id as meal_id,
        m.meal_time,
        m.meal_name,
        me.id as entry_id,
        me.quantity_g,
        me.calories_kcal,
        me.proteins_g,
        me.fats_g,
        me.carbs_g,
        p.name as product_name
      FROM meals m
      LEFT JOIN meal_entries me ON m.id = me.meal_id
      LEFT JOIN products p ON me.product_id = p.id
      WHERE m.user_id = $1 AND m.date = $2
      ORDER BY m.meal_time, p.name
    `;

    const result = await pool.query(query, [req.user.id, dateStr]);

    if (result.rows.length === 0) {
      return res.json({ success: true, date: dateStr, meals: [] });
    }

    const validRows = result.rows.filter((row) => row.meal_id);
    if (validRows.length === 0) {
      return res.json({ success: true, date: dateStr, meals: [] });
    }

    const meals = {};
    for (const row of validRows) {
      if (!meals[row.meal_id]) {
        meals[row.meal_id] = {
          meal_id: row.meal_id,
          meal_time: row.meal_time,
          meal_name: row.meal_name,
          products: [],
          totals: { calories: 0, proteins: 0, fats: 0, carbs: 0 },
        };
      }
      if (row.entry_id) {
        // 🔥 Убран category из объекта продукта
        meals[row.meal_id].products.push({
          entry_id: row.entry_id,
          product_name: row.product_name,
          quantity_g: row.quantity_g,
          calories: row.calories_kcal,
          proteins: row.proteins_g,
          fats: row.fats_g,
          carbs: row.carbs_g,
        });
        meals[row.meal_id].totals.calories += row.calories_kcal;
        meals[row.meal_id].totals.proteins += row.proteins_g;
        meals[row.meal_id].totals.fats += row.fats_g;
        meals[row.meal_id].totals.carbs += row.carbs_g;
      }
    }

    const mealsArray = Object.values(meals).map((meal) => ({
      ...meal,
      totals: {
        calories: Math.round(meal.totals.calories * 10) / 10,
        proteins: Math.round(meal.totals.proteins * 10) / 10,
        fats: Math.round(meal.totals.fats * 10) / 10,
        carbs: Math.round(meal.totals.carbs * 10) / 10,
      },
    }));

    res.json({ success: true, date: dateStr, meals: mealsArray });
  } catch (err) {
    console.error('GET /api/meals/entries error:', err);
    res.status(500).json({ success: false, error: 'Ошибка получения записей' });
  }
});

module.exports = router;
