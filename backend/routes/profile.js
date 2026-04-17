const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

// Получить профиль (FR-201, FR-202, FR-204, FR-205)
router.get('/', authenticate, async (req, res) => {
  try {
    const profile = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
    res.json(profile.rows[0] || {});
  } catch {
    res.status(500).json({ error: 'Ошибка загрузки профиля' });
  }
});

// Обновить профиль + авто-расчёт ИМТ и СНК
router.put('/', authenticate, async (req, res) => {
  try {
    const { gender, age, height_cm, weight_kg, goal } = req.body;
    // Валидация диапазонов (FR-203)
    if (
      height_cm < 100 ||
      height_cm > 250 ||
      weight_kg < 30 ||
      weight_kg > 250 ||
      age < 16 ||
      age > 120
    ) {
      return res.status(400).json({ error: 'Данные вне допустимых пределов' });
    }

    // Упрощённый расчёт (формулу можно вынести в отдельную утилиту)
    const heightM = height_cm / 100;
    const bmi = weight_kg / heightM ** 2;
    // Базовый обмен (Mifflin-St Jeor) + коэффициент цели
    let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
    bmr = req.user.gender === 'female' || gender === 'female' ? bmr - 161 : bmr + 5;
    const goalMultiplier = goal === 'Снижение веса' ? 0.8 : goal === 'Набор массы' ? 1.15 : 1.0;
    const daily_calorie_norm = Math.round(bmr * 1.2 * goalMultiplier); // 1.2 - мин. активность

    await pool.query(
      `UPDATE profiles SET gender=$1, age=$2, height_cm=$3, weight_kg=$4, goal=$5, bmi=$6, daily_calorie_norm=$7 WHERE user_id=$8`,
      [gender, age, height_cm, weight_kg, goal, bmi.toFixed(1), daily_calorie_norm, req.user.id],
    );

    res.json({ message: 'Профиль обновлён', bmi: bmi.toFixed(1), daily_calorie_norm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сохранения профиля' });
  }
});

module.exports = router;
