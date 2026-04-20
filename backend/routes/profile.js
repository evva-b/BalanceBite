const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

// Получить профиль
router.get('/', authenticate, async (req, res) => {
  try {
    const profile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    res.json(profile.rows[0] || {});
  } catch (err) {
    console.error('GET /api/profile error:', err);
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

// Обновить профиль
router.put('/', authenticate, async (req, res) => {
  try {
    const { gender, age, height_cm, weight_kg, goal } = req.body;

    // 🔥 ВАЛИДАЦИЯ (FR-203)
    const validationErrors = [];

    if (height_cm !== undefined) {
      const height = Number(height_cm);
      if (isNaN(height)) validationErrors.push('Рост должен быть числом');
      else if (height < 100 || height > 250)
        validationErrors.push('Рост должен быть в диапазоне от 100 до 250 см');
    }
    if (weight_kg !== undefined) {
      const weight = Number(weight_kg);
      if (isNaN(weight)) validationErrors.push('Вес должен быть числом');
      else if (weight < 30 || weight > 250)
        validationErrors.push('Вес должен быть в диапазоне от 30 до 250 кг');
    }
    if (age !== undefined) {
      const userAge = Number(age);
      if (isNaN(userAge)) validationErrors.push('Возраст должен быть числом');
      else if (userAge < 16 || userAge > 120)
        validationErrors.push('Возраст должен быть в диапазоне от 16 до 120 лет');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Ошибка валидации данных', details: validationErrors });
    }

    // 🔥 Рассчитываем ИМТ (только для ответа)
    let bmi = null;
    let daily_calorie_norm = null;

    if (height_cm != null && weight_kg != null && age != null) {
      const hM = Number(height_cm) / 100;
      const w = Number(weight_kg);
      const a = Number(age);

      bmi = w / (hM * hM);

      let bmr = 10 * w + 6.25 * Number(height_cm) - 5 * a;
      const userGender = req.user?.gender || gender;
      bmr = userGender === 'female' ? bmr - 161 : bmr + 5;

      const mult = goal === 'Снижение веса' ? 0.8 : goal === 'Набор массы' ? 1.15 : 1.0;
      daily_calorie_norm = Math.round(bmr * 1.2 * mult);
    }

    // 🔥 Проверяем существование профиля
    const existing = await pool.query('SELECT id FROM profiles WHERE user_id = $1', [req.user.id]);

    if (existing.rows.length > 0) {
      // UPDATE существующего профиля (БЕЗ created_at/updated_at!)
      const fields = [];
      const values = [];
      let idx = 1;

      if (gender !== undefined) {
        fields.push(`gender = $${idx++}`);
        values.push(gender);
      }
      if (age !== undefined) {
        fields.push(`age = $${idx++}`);
        values.push(age);
      }
      if (height_cm !== undefined) {
        fields.push(`height_cm = $${idx++}`);
        values.push(height_cm);
      }
      if (weight_kg !== undefined) {
        fields.push(`weight_kg = $${idx++}`);
        values.push(weight_kg);
      }
      if (goal !== undefined) {
        fields.push(`goal = $${idx++}`);
        values.push(goal);
      }
      if (daily_calorie_norm !== null) {
        fields.push(`daily_calorie_norm = $${idx++}`);
        values.push(daily_calorie_norm);
      }

      values.push(req.user.id);

      await pool.query(`UPDATE profiles SET ${fields.join(', ')} WHERE user_id = $${idx}`, values);
    } else {
      // INSERT нового профиля (БЕЗ created_at/updated_at/bmi!)
      await pool.query(
        `INSERT INTO profiles (
          user_id, gender, age, height_cm, weight_kg, goal, daily_calorie_norm
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          gender ?? null,
          age ?? null,
          height_cm ?? null,
          weight_kg ?? null,
          goal ?? null,
          daily_calorie_norm ?? null,
        ],
      );
    }

    // 🔥 Возвращаем BMI в ответе
    res.json({
      message: 'Профиль обновлён',
      bmi: bmi?.toFixed(1) ?? null,
      daily_calorie_norm: daily_calorie_norm ?? null,
    });
  } catch (err) {
    console.error('PUT /api/profile error:', err.message);
    res.status(500).json({ error: 'Ошибка сохранения профиля' });
  }
});

/**
 * @route GET /api/profile/bmi
 * @description Рассчитать ИМТ текущего пользователя
 * @access Private (требуется авторизация)
 */
router.get('/bmi', authenticate, async (req, res) => {
  try {
    // Получаем профиль из БД
    const profileResult = await pool.query(
      'SELECT height_cm, weight_kg FROM profiles WHERE user_id = $1',
      [req.user.id],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден',
        details: ['Сначала создайте профиль с указанием роста и веса'],
      });
    }

    const profile = profileResult.rows[0];

    // Проверяем, есть ли данные
    if (!profile.height_cm || !profile.weight_kg) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных',
        details: ['В профиле не указан рост или вес'],
      });
    }

    // Рассчитываем ИМТ
    const { calculateBMI } = require('../utils/bmiCalculator');
    const bmiResult = calculateBMI(profile.weight_kg, profile.height_cm);

    if (!bmiResult.success) {
      return res.status(400).json(bmiResult);
    }

    res.json({
      success: true,
      message: 'ИМТ успешно рассчитан',
      data: bmiResult.data,
      meta: {
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('GET /api/profile/bmi error:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при расчёте ИМТ',
    });
  }
});

/**
 * @route GET /api/profile/metrics
 * @description Получить все метрики профиля (ИМТ, рост, вес, возраст)
 * @access Private (требуется авторизация)
 */
router.get('/metrics', authenticate, async (req, res) => {
  try {
    // Получаем полный профиль
    const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [
      req.user.id,
    ]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден',
        details: ['Профиль ещё не создан'],
      });
    }

    const profile = profileResult.rows[0];
    const metrics = {
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      age: profile.age,
      gender: profile.gender,
      goal: profile.goal,
      daily_calorie_norm: profile.daily_calorie_norm,
    };

    // Если есть рост и вес, добавляем ИМТ
    if (profile.height_cm && profile.weight_kg) {
      const { calculateBMI } = require('../utils/bmiCalculator');
      const bmiResult = calculateBMI(profile.weight_kg, profile.height_cm);

      if (bmiResult.success) {
        metrics.bmi = bmiResult.data.bmi;
        metrics.bmiCategory = bmiResult.data.category;
        metrics.bmiCategoryCode = bmiResult.data.categoryCode;
        metrics.healthyWeightRange = bmiResult.data.healthyWeightRange;
      }
    }

    res.json({
      success: true,
      message: 'Метрики успешно получены',
      data: metrics,
    });
  } catch (err) {
    console.error('GET /api/profile/metrics error:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении метрик',
    });
  }
});

module.exports = router;
