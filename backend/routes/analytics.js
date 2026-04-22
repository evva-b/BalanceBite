const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

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
