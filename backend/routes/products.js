const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

// ============================================================================
// 🔍 GET /api/diary/products/search - Поиск продуктов
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    // 1. На фронтенде параметр называется 'q', а тут 'query'. Исправляем:
    const searchQuery = req.query.q || req.query.query || '';
    const limit = parseInt(req.query.limit) || 20;

    const result = await pool.query(
      `SELECT id, name, calories_kcal, proteins_g, fats_g, carbs_g
       FROM products 
       WHERE (user_id = $1 OR user_id IS NULL) 
       AND name ILIKE $2 
       ORDER BY name ASC
       LIMIT $3`,
      [req.user.id, `%${searchQuery}%`, limit],
    );

    // 2. ОЧЕНЬ ВАЖНО: Обернуть результат в объект с ключом 'products'
    // Именно этого ждет твой фронтенд: res.data?.data?.products
    res.json({
      success: true,
      data: {
        products: result.rows,
      },
    });
  } catch (err) {
    console.error('❌ GET /products error:', err.message);
    res.status(500).json({ error: 'Ошибка поиска продуктов' });
  }
});

// ============================================================================
// GET /api/products/:id - Детали
// ============================================================================
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await findProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Продукт не найден' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================================================
// ➕ POST /api/products/:id/add-to-diary - Добавление в дневник
// ============================================================================
router.post('/:id/add-to-diary', authenticate, async (req, res) => {
  const { id } = req.params; // product_id
  const { quantity_g, custom_meal_name, custom_meal_time } = req.body;
  const userId = req.user.id;

  // Текущая дата для столбца 'date'
  const date = new Date().toISOString().split('T')[0];

  try {
    await pool.query('BEGIN');

    // 1. Получаем данные о продукте, чтобы заполнить КБЖУ в meal_entries
    const productData = await pool.query(
      `SELECT name, calories_kcal, proteins_g, fats_g, carbs_g FROM products WHERE id = $1`,
      [id],
    );

    if (productData.rows.length === 0) {
      throw new Error('Продукт не найден в базе');
    }

    const p = productData.rows[0];
    const ratio = quantity_g / 100;

    // 2. Ищем или создаем прием пищи (используем имя 'date' из фото)
    let mealResult = await pool.query(
      `SELECT id FROM meals 
       WHERE user_id = $1 AND meal_name = $2 AND date = $3`,
      [userId, custom_meal_name, date],
    );

    let mealId;
    if (mealResult.rows.length === 0) {
      const newMeal = await pool.query(
        `INSERT INTO meals (user_id, meal_name, date, meal_time) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, custom_meal_name, date, custom_meal_time || '12:00:00'],
      );
      mealId = newMeal.rows[0].id;
    } else {
      mealId = mealResult.rows[0].id;
    }

    // 3. Добавляем в meal_entries (заполняем ВСЕ колонки с фото)
    await pool.query(
      `INSERT INTO meal_entries 
       (meal_id, product_id, quantity_g, calories_kcal, proteins_g, fats_g, carbs_g, product_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        mealId,
        id,
        quantity_g,
        Math.round(p.calories_kcal * ratio),
        (p.proteins_g * ratio).toFixed(1),
        (p.fats_g * ratio).toFixed(1),
        (p.carbs_g * ratio).toFixed(1),
        p.name,
      ],
    );

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Добавлено успешно!' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Ошибка бэкенда:', err.message);
    res.status(500).json({ error: 'Ошибка сервера при сохранении' });
  }
});

// ============================================================================
// ➕ POST /api/diary/products - Создать кастомный продукт
// ============================================================================
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, calories_kcal, proteins_g, fats_g, carbs_g, is_custom = true } = req.body;

    if (!name || calories_kcal === undefined) {
      return res.status(400).json({ error: 'Название и калории обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO products 
       (user_id, name, calories_kcal, proteins_g, fats_g, carbs_g, is_custom, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, name, calories_kcal, proteins_g, fats_g, carbs_g`,
      [req.user.id, name, calories_kcal, proteins_g || 0, fats_g || 0, carbs_g || 0, is_custom],
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('❌ POST /products error:', err.message);
    res.status(500).json({ error: 'Ошибка создания продукта' });
  }
});

module.exports = router;
