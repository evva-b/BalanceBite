const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const { calculateCalorieNorm } = require('../utils/calorieCalculator');
const router = express.Router();

router.get('/nutrition-history', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимо указать startDate и endDate' });
    }

    const result = await pool.query(
      `SELECT 
         m.date,
         COALESCE(SUM(me.proteins_g), 0) as total_proteins,
         COALESCE(SUM(me.fats_g), 0) as total_fats,
         COALESCE(SUM(me.carbs_g), 0) as total_carbs,
         COALESCE(SUM(me.calories_kcal), 0) as total_calories
       FROM meals m
       LEFT JOIN meal_entries me ON m.id = me.meal_id
       WHERE m.user_id = $1 
         AND m.date BETWEEN $2 AND $3
       GROUP BY m.date
       ORDER BY m.date ASC`,
      [req.user.id, startDate, endDate],
    );

    res.json({
      success: true,
      data: {
        dailyData: result.rows,
        stats: {
          totalDays: result.rows.length,
          averageProteins:
            result.rows.length > 0
              ? result.rows.reduce((a, b) => a + Number(b.total_proteins), 0) / result.rows.length
              : 0,
          averageFats:
            result.rows.length > 0
              ? result.rows.reduce((a, b) => a + Number(b.total_fats), 0) / result.rows.length
              : 0,
          averageCarbs:
            result.rows.length > 0
              ? result.rows.reduce((a, b) => a + Number(b.total_carbs), 0) / result.rows.length
              : 0,
          averageCalories:
            result.rows.length > 0
              ? result.rows.reduce((a, b) => a + Number(b.total_calories), 0) / result.rows.length
              : 0,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/analytics/nutrition-history error:', err);
    res.status(500).json({ error: 'Ошибка получения истории питания' });
  }
});

// ============================================================================
// GET /api/profile - Получить профиль
// ============================================================================
router.get('/', authenticate, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, email, phone, status FROM users WHERE id = $1',
      [req.user.id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = userResult.rows[0];

    const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [
      req.user.id,
    ]);

    const profile = profileResult.rows[0] || {};

    // Нелюбимые продукты
    const dislikedResult = await pool.query(
      'SELECT product_name FROM user_disliked_products WHERE user_id = $1',
      [req.user.id],
    );
    const dislikedProducts = dislikedResult.rows.map((r) => r.product_name);

    // Любимые продукты
    const favoritesResult = await pool.query(
      `SELECT p.id, p.name, p.calories_kcal, p.proteins_g, p.fats_g, p.carbs_g
       FROM user_favorites fp
       JOIN products p ON fp.product_id = p.id
       WHERE fp.user_id = $1`,
      [req.user.id],
    );

    // ✅ ИСПРАВЛЕНО: добавлен ключ data: перед объектом
    res.json({
      success: true,
      data: {
        email: user.email,
        phone: user.phone,
        status: user.status,
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        goal: profile.goal,
        activity_level: profile.activity_level,
        daily_calorie_norm: profile.daily_calorie_norm,
        dislikedProducts,
        favoriteProducts: favoritesResult.rows,
      },
    });
  } catch (err) {
    console.error('GET /api/profile error:', err);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

// ============================================================================
// PUT /api/profile - Обновить профиль
// ============================================================================
router.put('/', authenticate, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      email,
      phone,
      status,
      gender,
      age,
      height_cm,
      weight_kg,
      goal,
      activity_level,
      dislikedProducts,
      favoriteProductIds,
    } = req.body;

    await client.query('BEGIN');

    // 1. Обновляем users
    if (email !== undefined || phone !== undefined || status !== undefined) {
      const userFields = [];
      const userValues = [];
      let idx = 1;

      if (email !== undefined) {
        userFields.push(`email = $${idx++}`);
        userValues.push(email);
      }
      if (phone !== undefined) {
        userFields.push(`phone = $${idx++}`);
        userValues.push(phone);
      }
      if (status !== undefined) {
        userFields.push(`status = $${idx++}`);
        userValues.push(status);
      }

      if (userFields.length > 0) {
        userValues.push(req.user.id);
        await client.query(
          `UPDATE users SET ${userFields.join(', ')} WHERE id = $${idx}`,
          userValues,
        );
      }
    }
    let daily_calorie_norm = null;

    // 2. Обновляем/создаём profile
    if (
      gender !== undefined ||
      age !== undefined ||
      height_cm !== undefined ||
      weight_kg !== undefined ||
      goal !== undefined ||
      activity_level !== undefined
    ) {
      const existing = await client.query('SELECT id FROM profiles WHERE user_id = $1', [
        req.user.id,
      ]);

      // 🔥 Расчёт калорий с учётом уровня активности
      let daily_calorie_norm = null;
      if (height_cm && weight_kg && age && gender) {
        const activityMultiplier = getActivityLevelMultiplier(activity_level);

        const calorieCalc = calculateCalorieNorm({
          weightKg: weight_kg,
          heightCm: height_cm,
          age: age,
          gender: gender,
          goal: goal || 'Поддержание веса',
          activityLevel: activityMultiplier,
        });

        if (calorieCalc.success) {
          daily_calorie_norm = calorieCalc.data.dailyCalorieNorm;
        }
      }

      if (existing.rows.length > 0) {
        // UPDATE
        const profileFields = [];
        const profileValues = [];
        let pIdx = 1;

        if (gender !== undefined) {
          profileFields.push(`gender = $${pIdx++}`);
          profileValues.push(gender);
        }
        if (age !== undefined) {
          profileFields.push(`age = $${pIdx++}`);
          profileValues.push(age);
        }
        if (height_cm !== undefined) {
          profileFields.push(`height_cm = $${pIdx++}`);
          profileValues.push(height_cm);
        }
        if (weight_kg !== undefined) {
          profileFields.push(`weight_kg = $${pIdx++}`);
          profileValues.push(weight_kg);
        }
        if (goal !== undefined) {
          profileFields.push(`goal = $${pIdx++}`);
          profileValues.push(goal);
        }
        if (activity_level !== undefined) {
          profileFields.push(`activity_level = $${pIdx++}`);
          profileValues.push(activity_level);
        }
        if (daily_calorie_norm !== null) {
          profileFields.push(`daily_calorie_norm = $${pIdx++}`);
          profileValues.push(daily_calorie_norm);
        }

        if (profileFields.length > 0) {
          profileValues.push(req.user.id);
          await client.query(
            `UPDATE profiles SET ${profileFields.join(', ')} WHERE user_id = $${pIdx}`,
            profileValues,
          );
        }
      } else {
        // INSERT
        await client.query(
          `INSERT INTO profiles (user_id, gender, age, height_cm, weight_kg, goal, activity_level, daily_calorie_norm)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            req.user.id,
            gender || null,
            age || null,
            height_cm || null,
            weight_kg || null,
            goal || null,
            activity_level || null,
            daily_calorie_norm,
          ],
        );
      }
    }

    // 3. Обновляем нелюбимые продукты
    if (Array.isArray(dislikedProducts)) {
      await client.query('DELETE FROM user_disliked_products WHERE user_id = $1', [req.user.id]);

      for (const product of dislikedProducts) {
        if (product && product.trim()) {
          await client.query(
            'INSERT INTO user_disliked_products (user_id, product_name) VALUES ($1, $2)',
            [req.user.id, product.trim()],
          );
        }
      }
    }

    // 4. Обновляем любимые продукты
    if (Array.isArray(favoriteProductIds)) {
      await client.query('DELETE FROM user_favorites WHERE user_id = $1', [req.user.id]);

      for (const productId of favoriteProductIds) {
        await client.query('INSERT INTO user_favorites (user_id, product_id) VALUES ($1, $2)', [
          req.user.id,
          productId,
        ]);
      }
    }

    await client.query('COMMIT');

    // ✅ ИСПРАВЛЕНО: добавлен ключ data: перед объектом
    res.json({
      success: true,
      message: 'Профиль успешно обновлён',
      data: {
        daily_calorie_norm: daily_calorie_norm || null,
        calculated: daily_calorie_norm !== null,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/profile error:', err);
    res.status(500).json({ error: 'Ошибка сохранения профиля' });
  } finally {
    client.release();
  }
});

// ============================================================================
// Вспомогательная функция: маппинг уровня активности
// ============================================================================
function getActivityLevelMultiplier(level) {
  const map = {
    minimal: 1.2, // Минимальная (сидячий образ жизни)
    moderate: 1.55, // Умеренная (тренировки 3-5 раз/неделю)
    high: 1.725, // Высокая (интенсивные тренировки 6-7 раз/неделю)
  };
  return map[level] || 1.2;
}

router.post('/weight', authenticate, async (req, res) => {
  try {
    const { measurement_date, weight_kg, note } = req.body;

    // Валидация
    if (!measurement_date) {
      return res.status(400).json({ error: 'Дата измерения обязательна' });
    }
    if (!weight_kg || isNaN(weight_kg) || weight_kg <= 0) {
      return res.status(400).json({ error: 'Вес должен быть положительным числом' });
    }

    // Проверяем формат даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(measurement_date)) {
      return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });
    }

    // Проверяем, существует ли таблица weight_measurements
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'weight_measurements'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      // Создаём таблицу, если её нет
      await pool.query(`
        CREATE TABLE IF NOT EXISTS weight_measurements (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            measurement_date DATE NOT NULL,
            weight_kg DECIMAL(5,2) NOT NULL,
            note TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Добавляем уникальное ограничение
      await pool.query(`
        ALTER TABLE weight_measurements 
        ADD CONSTRAINT IF NOT EXISTS unique_user_date 
        UNIQUE (user_id, measurement_date);
      `);
    }

    // Сохраняем или обновляем взвешивание
    const result = await pool.query(
      `INSERT INTO weight_measurements (user_id, measurement_date, weight_kg, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, measurement_date) 
       DO UPDATE SET 
         weight_kg = EXCLUDED.weight_kg,
         note = EXCLUDED.note
       RETURNING id, measurement_date, weight_kg, note`,
      [req.user.id, measurement_date, weight_kg, note || null],
    );

    res.json({
      success: true,
      message: 'Взвешивание сохранено',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('POST /api/analytics/weight error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({
      error: 'Ошибка сохранения взвешивания',
      details: err.message,
    });
  }
});

router.get('/weight-history', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Необходимо указать startDate и endDate' });
    }

    // Проверяем формат даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ error: 'Неверный формат даты. Используйте YYYY-MM-DD' });
    }

    // Проверяем существование таблицы
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'weight_measurements'
      );
    `);

    let measurements = [];
    let stats = {
      totalMeasurements: 0,
      startWeight: null,
      endWeight: null,
      weightChange: null,
      averageWeight: null,
      minWeight: null,
      maxWeight: null,
      progressToGoal: null,
    };

    if (tableCheck.rows[0].exists) {
      // Получаем историю взвешиваний
      const weightResult = await pool.query(
        `SELECT measurement_date, weight_kg, note, created_at
         FROM weight_measurements
         WHERE user_id = $1 
           AND measurement_date BETWEEN $2 AND $3
         ORDER BY measurement_date ASC`,
        [req.user.id, startDate, endDate],
      );
      measurements = weightResult.rows;

      if (measurements.length > 0) {
        stats.totalMeasurements = measurements.length;
        stats.startWeight = parseFloat(measurements[0].weight_kg);
        stats.endWeight = parseFloat(measurements[measurements.length - 1].weight_kg);
        stats.weightChange = parseFloat((stats.endWeight - stats.startWeight).toFixed(2));

        const weights = measurements.map((m) => parseFloat(m.weight_kg));
        stats.averageWeight = parseFloat(
          (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2),
        );
        stats.minWeight = parseFloat(Math.min(...weights).toFixed(2));
        stats.maxWeight = parseFloat(Math.max(...weights).toFixed(2));
      }
    }

    // Получаем текущий вес из профиля
    const profileResult = await pool.query(
      `SELECT weight_kg, goal FROM profiles WHERE user_id = $1`,
      [req.user.id],
    );
    const profile = profileResult.rows[0];

    res.json({
      success: true,
      data: {
        measurements,
        stats,
        goal: profile
          ? {
              current_weight: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
              goal: profile.goal,
            }
          : null,
      },
    });
  } catch (err) {
    console.error('GET /api/analytics/weight-history error:', err);
    res.status(500).json({ error: 'Ошибка получения истории взвешиваний' });
  }
});

module.exports = router;
