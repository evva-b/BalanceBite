const express = require('express');
const pool = require('../db');
const router = express.Router();
const authenticate = require('./profile').authenticate; // или вынесите в middleware.js

// Добавить приём пищи (FR-301, FR-304, FR-306)
router.post('/add', authenticate, async (req, res) => {
  try {
    const { date, meal_time, meal_name, products } = req.body;
    // products: [{ product_id, quantity_g }]

    // Создаём запись приёма пищи
    const meal = await pool.query(
      'INSERT INTO meals (user_id, date, meal_time, meal_name) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, date, meal_time, meal_name],
    );
    const mealId = meal.rows[0].id;

    let dayTotals = { c: 0, p: 0, f: 0, u: 0 };

    for (const item of products) {
      if (item.quantity_g <= 0)
        return res.status(400).json({ error: 'Количество должно быть > 0 (FR-306)' });

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

    res.status(201).json({ message: 'Приём пищи добавлен', totals: dayTotals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сохранения' });
  }
});

module.exports = router;
