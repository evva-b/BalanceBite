const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

router.post('/nutrition', authenticate, async (req, res) => {
    try {
        const { date, proteins_g, fats_g, carbs_g, calories_kcal, meal_name } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Дата обязательна' });
        }

        // Проверяем формат даты
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });
        }

        // Начинаем транзакцию
        await pool.query('BEGIN');

        // Проверяем, есть ли уже прием пищи за этот день
        let mealResult = await pool.query(
            `SELECT id FROM meals 
       WHERE user_id = $1 AND date = $2 AND meal_name = $3`,
            [req.user.id, date, meal_name || 'Основной прием']
        );

        let mealId;
        if (mealResult.rows.length === 0) {
            // Создаем новый прием пищи
            const newMeal = await pool.query(
                `INSERT INTO meals (user_id, date, meal_name) 
         VALUES ($1, $2, $3) RETURNING id`,
                [req.user.id, date, meal_name || 'Основной прием']
            );
            mealId = newMeal.rows[0].id;
        } else {
            mealId = mealResult.rows[0].id;
        }

        // Добавляем запись о питании (можно создать "виртуальный" продукт или записать напрямую)
        const entryResult = await pool.query(
            `INSERT INTO meal_entries 
       (meal_id, product_id, quantity_g, calories_kcal, proteins_g, fats_g, carbs_g)
       VALUES ($1, NULL, $2, $3, $4, $5, $6)
       RETURNING id`,
            [mealId, 100, calories_kcal || 0, proteins_g || 0, fats_g || 0, carbs_g || 0]
        );

        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Данные о питании сохранены',
            data: {
                date,
                proteins_g: proteins_g || 0,
                fats_g: fats_g || 0,
                carbs_g: carbs_g || 0,
                calories_kcal: calories_kcal || 0
            }
        });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('POST /api/analytics/nutrition error:', err);
        res.status(500).json({ error: 'Ошибка сохранения данных о питании' });
    }
});

router.post('/meal', authenticate, async (req, res) => {
    try {
        const { date, meal_name, products } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Дата обязательна' });
        }

        if (!products || !Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: 'Необходимо указать список продуктов' });
        }

        await pool.query('BEGIN');

        // Создаем прием пищи
        const mealResult = await pool.query(
            `INSERT INTO meals (user_id, date, meal_name) 
       VALUES ($1, $2, $3) RETURNING id`,
            [req.user.id, date, meal_name || 'Прием пищи']
        );
        const mealId = mealResult.rows[0].id;

        // Добавляем каждый продукт
        for (const product of products) {
            let productId = product.product_id;

            // Если продукта нет в БД, создаем временный
            if (!productId && product.name) {
                const existingProduct = await pool.query(
                    `SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                    [product.name]
                );

                if (existingProduct.rows.length > 0) {
                    productId = existingProduct.rows[0].id;
                } else {
                    const newProduct = await pool.query(
                        `INSERT INTO products (name, calories_kcal, proteins_g, fats_g, carbs_g, is_custom, user_id)
             VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id`,
                        [product.name, product.calories || 0, product.proteins || 0, product.fats || 0, product.carbs || 0, req.user.id]
                    );
                    productId = newProduct.rows[0].id;
                }
            }

            await pool.query(
                `INSERT INTO meal_entries (meal_id, product_id, quantity_g, calories_kcal, proteins_g, fats_g, carbs_g)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    mealId,
                    productId,
                    product.quantity_g || 100,
                    product.calories || 0,
                    product.proteins || 0,
                    product.fats || 0,
                    product.carbs || 0
                ]
            );
        }

        await pool.query('COMMIT');

        res.json({
            success: true,
            message: 'Прием пищи сохранен',
            data: { mealId, date, meal_name }
        });

    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('POST /api/analytics/meal error:', err);
        res.status(500).json({ error: 'Ошибка сохранения приема пищи' });
    }
});

// ============================================================================
// FR-401: История взвешиваний за период
// ============================================================================
router.get('/weight-history', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимо указать startDate и endDate' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });
    }

    // Получаем историю взвешиваний
    const weightResult = await pool.query(
      `SELECT measurement_date, weight_kg, note, created_at
       FROM weight_measurements
       WHERE user_id = $1 
         AND measurement_date BETWEEN $2 AND $3
       ORDER BY measurement_date ASC`,
      [req.user.id, startDate, endDate],
    );

    // 🔥 Получаем ТЕКУЩИЙ вес из profiles (вместо target_weight_kg)
    const profileResult = await pool.query(
      `SELECT weight_kg, goal FROM profiles WHERE user_id = $1`,
      [req.user.id],
    );

    const measurements = weightResult.rows;
    const profile = profileResult.rows[0];

    // Рассчитываем статистику
    let stats = {
      totalMeasurements: measurements.length,
      startWeight: null,
      endWeight: null,
      weightChange: null,
      averageWeight: null,
      minWeight: null,
      maxWeight: null,
      progressToGoal: null,
    };

    if (measurements.length > 0) {
      stats.startWeight = parseFloat(measurements[0].weight_kg);
      stats.endWeight = parseFloat(measurements[measurements.length - 1].weight_kg);
      stats.weightChange = parseFloat((stats.endWeight - stats.startWeight).toFixed(2));

      const weights = measurements.map((m) => parseFloat(m.weight_kg));
      stats.averageWeight = parseFloat(
        (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2),
      );
      stats.minWeight = parseFloat(Math.min(...weights).toFixed(2));
      stats.maxWeight = parseFloat(Math.max(...weights).toFixed(2));

      // 🔥 Прогресс к цели: считаем от текущего веса в profiles
      if (profile && profile.weight_kg && profile.goal) {
        const currentWeight = parseFloat(profile.weight_kg);
        const targetWeight =
          profile.goal === 'Снижение веса'
            ? currentWeight - 5 // 🔥 Пример: цель -5 кг
            : profile.goal === 'Набор массы'
              ? currentWeight + 5
              : currentWeight;

        const totalChangeNeeded = targetWeight - stats.startWeight;
        const actualChange = stats.endWeight - stats.startWeight;

        if (totalChangeNeeded !== 0) {
          stats.progressToGoal = parseFloat(((actualChange / totalChangeNeeded) * 100).toFixed(1));
        }
      }
    }

    res.json({
      success: true,
      data: {
        measurements,
        stats,
        goal: profile ? { current_weight: profile.weight_kg, goal: profile.goal } : null,
      },
    });
  } catch (err) {
    console.error('GET /api/analytics/weight-history error:', err);
    res.status(500).json({ error: 'Ошибка получения истории взвешиваний' });
  }
});

// ============================================================================
// FR-402: Потребление калорий за период
// ============================================================================
router.get('/calorie-consumption', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимо указать startDate и endDate' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });
    }

    const consumptionResult = await pool.query(
      `SELECT 
         m.date,
         COALESCE(SUM(me.calories_kcal), 0) as total_calories,
         COALESCE(SUM(me.proteins_g), 0) as total_proteins,
         COALESCE(SUM(me.fats_g), 0) as total_fats,
         COALESCE(SUM(me.carbs_g), 0) as total_carbs
       FROM meals m
       LEFT JOIN meal_entries me ON m.id = me.meal_id
       WHERE m.user_id = $1 
         AND m.date BETWEEN $2 AND $3
       GROUP BY m.date
       ORDER BY m.date ASC`,
      [req.user.id, startDate, endDate],
    );

    const dailyConsumption = consumptionResult.rows;
    let stats = {
      totalDays: dailyConsumption.length,
      averageCalories: 0,
      averageProteins: 0,
      averageFats: 0,
      averageCarbs: 0,
      totalCalories: 0,
      totalProteins: 0,
      totalFats: 0,
      totalCarbs: 0,
      maxCalories: 0,
      minCalories: 0,
    };

    if (dailyConsumption.length > 0) {
      const calories = dailyConsumption.map((d) => parseFloat(d.total_calories));
      const proteins = dailyConsumption.map((d) => parseFloat(d.total_proteins));
      const fats = dailyConsumption.map((d) => parseFloat(d.total_fats));
      const carbs = dailyConsumption.map((d) => parseFloat(d.total_carbs));

      stats.totalCalories = Math.round(calories.reduce((a, b) => a + b, 0));
      stats.totalProteins = Math.round(proteins.reduce((a, b) => a + b, 0));
      stats.totalFats = Math.round(fats.reduce((a, b) => a + b, 0));
      stats.totalCarbs = Math.round(carbs.reduce((a, b) => a + b, 0));

      stats.averageCalories = Math.round(stats.totalCalories / dailyConsumption.length);
      stats.averageProteins = Math.round(stats.totalProteins / dailyConsumption.length);
      stats.averageFats = Math.round(stats.totalFats / dailyConsumption.length);
      stats.averageCarbs = Math.round(stats.totalCarbs / dailyConsumption.length);
      stats.maxCalories = Math.round(Math.max(...calories));
      stats.minCalories = Math.round(Math.min(...calories));
    }

    // Получаем норму калорий из профиля
    const profileResult = await pool.query(
      `SELECT daily_calorie_norm FROM profiles WHERE user_id = $1`,
      [req.user.id],
    );
    const profile = profileResult.rows[0];
    const targets = {
      calories: profile?.daily_calorie_norm ? parseFloat(profile.daily_calorie_norm) : 2000,
      proteins: 120,
      fats: 60,
      carbs: 250,
    };

    res.json({
      success: true,
      data: { dailyConsumption, stats, targets },
    });
  } catch (err) {
    console.error('GET /api/analytics/calorie-consumption error:', err);
    res.status(500).json({ error: 'Ошибка получения данных о потреблении' });
  }
});

// ============================================================================
// POST /api/analytics/weight - Добавить взвешивание
// ============================================================================
router.post('/weight', authenticate, async (req, res) => {
  try {
    const { measurement_date, weight_kg, note } = req.body;

    if (!measurement_date || !weight_kg) {
      return res.status(400).json({ error: 'Дата и вес обязательны' });
    }

    // 🔥 Убран updated_at — его нет в твоей схеме!
    const result = await pool.query(
      `INSERT INTO weight_measurements 
       (user_id, measurement_date, weight_kg, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, measurement_date) 
       DO UPDATE SET 
         weight_kg = EXCLUDED.weight_kg,
         note = EXCLUDED.note
       RETURNING *`,
      [req.user.id, measurement_date, weight_kg, note || null],
    );

    res.json({
      success: true,
      message: 'Взвешивание сохранено',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('POST /api/analytics/weight error:', err);
    res.status(500).json({ error: 'Ошибка сохранения взвешивания' });
  }
});

module.exports = router;
