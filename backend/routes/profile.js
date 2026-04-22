const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const { calculateCalorieNorm } = require('../utils/calorieCalculator');
const router = express.Router();

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
       FROM favorite_products fp
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
      await client.query('DELETE FROM favorite_products WHERE user_id = $1', [req.user.id]);

      for (const productId of favoriteProductIds) {
        await client.query('INSERT INTO favorite_products (user_id, product_id) VALUES ($1, $2)', [
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
        daily_calorie_norm,
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

module.exports = router;
