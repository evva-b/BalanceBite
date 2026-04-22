const express = require('express');
const pool = require('../db');
const authenticate = require('../middlewares/authenticate');
const router = express.Router();

router.put('/', authenticate, async (req, res) => {
  try {
      const { 
      gender, age, height_cm, weight_kg, goal,
      email, phone, status,
      activity_level,
      dislikedProducts, 
      favoriteProductIds 
    } = req.body;
    const validationErrors = [];

    // Валидация
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
      return res.status(400).json({ 
        error: 'Ошибка валидации данных', 
        details: validationErrors 
      });
    }

    if (email !== undefined || phone !== undefined || status !== undefined) {
      const userFields = [];
      const userValues = [];
      let userIdx = 1;
      
      if (email !== undefined) {
        userFields.push(`email = $${userIdx++}`);
        userValues.push(email);
      }
      if (phone !== undefined) {
        userFields.push(`phone = $${userIdx++}`);
        userValues.push(phone);
      }
      if (status !== undefined) {
        userFields.push(`status = $${userIdx++}`);
        userValues.push(status);
      }
      
      userValues.push(req.user.id);
      
      // Проверяем, существуют ли колонки phone и status
      try {
        await pool.query(
          `UPDATE users SET ${userFields.join(', ')} WHERE id = $${userIdx}`,
          userValues
        );
        console.log('Данные пользователя обновлены:', { email, phone, status });
      } catch (err) {
        // Если колонки нет, добавляем её
        if (err.message.includes('column "phone" does not exist')) {
          await pool.query('ALTER TABLE users ADD COLUMN phone VARCHAR(20)');
          await pool.query(
            `UPDATE users SET ${userFields.join(', ')} WHERE id = $${userIdx}`,
            userValues
          );
        }
        if (err.message.includes('column "status" does not exist')) {
          await pool.query('ALTER TABLE users ADD COLUMN status VARCHAR(100)');
          await pool.query(
            `UPDATE users SET ${userFields.join(', ')} WHERE id = $${userIdx}`,
            userValues
          );
        }
      }
    }

    // Рассчитываем норму калорий
    let daily_calorie_norm = null;

    if (height_cm != null && weight_kg != null && age != null && gender != null) {
      const hM = Number(height_cm) / 100;
      const w = Number(weight_kg);
      const a = Number(age);

      let bmr = 10 * w + 6.25 * Number(height_cm) - 5 * a;
      bmr = gender === 'Ж' ? bmr - 161 : bmr + 5;
      
      const activityMultiplier = 
        activity_level === 'high' ? 1.9 :
        activity_level === 'moderate' ? 1.55 : 1.2;

      const goalMultiplier = 
        goal === 'Снижение веса' ? 0.8 : 
        goal === 'Набор массы' ? 1.15 : 1.0;
      
      daily_calorie_norm = Math.round(bmr * 1.2 * goalMultiplier);
    }

    // Обновляем профиль
    const existing = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (existing.rows.length > 0) {
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
      if (activity_level !== undefined) {  // 👈 ДОБАВЬ
        fields.push(`activity_level = $${idx++}`);
        values.push(activity_level);
      }
      if (daily_calorie_norm !== null) {
        fields.push(`daily_calorie_norm = $${idx++}`);
        values.push(daily_calorie_norm);
      }

      if (fields.length > 0) {
        values.push(req.user.id);
        await pool.query(
          `UPDATE profiles SET ${fields.join(', ')} WHERE user_id = $${idx}`,
          values
        );
      }
    } else {
      await pool.query(
        `INSERT INTO profiles (user_id, gender, age, height_cm, weight_kg, goal, daily_calorie_norm)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user.id, gender || null, age || null, height_cm || null, weight_kg || null, goal || null, daily_calorie_norm]
      );
    }

    res.json({
      success: true,
      message: 'Профиль успешно обновлён',
      data: {
        daily_calorie_norm: daily_calorie_norm,
        calculated: daily_calorie_norm !== null
      }
    });

  } catch (err) {
    console.error('PUT /api/profile error:', err.message);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка сохранения профиля'
    });
  }
});


router.get('/', authenticate, async (req, res) => {
  try {
    // Получаем данные пользователя (включая phone и status)
    const userResult = await pool.query(
      'SELECT email, phone, status FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Пользователь не найден'
      });
    }
    
    const user = userResult.rows[0];
    
    // Получаем профиль
    const profileResult = await pool.query(
      'SELECT gender, age, height_cm, weight_kg, goal, activity_level, daily_calorie_norm FROM profiles WHERE user_id = $1',
      [req.user.id]
    );
    
    const profile = profileResult.rows[0] || {};
    
    // Получаем нелюбимые продукты
    let dislikedProducts = [];
    try {
      const dislikedResult = await pool.query(
        'SELECT product_name FROM user_disliked_products WHERE user_id = $1',
        [req.user.id]
      );
      dislikedProducts = dislikedResult.rows.map(row => row.product_name);
    } catch (err) {
      console.log('Таблица user_disliked_products не существует');
    }
    
    // Получаем любимые продукты
    let favoriteProducts = [];
    try {
      const favoriteResult = await pool.query(
        `SELECT 
          p.id, 
          p.name, 
          COALESCE(p.calories_kcal, 0) as calories_kcal,
          COALESCE(p.proteins_g, 0) as proteins_g,
          COALESCE(p.fats_g, 0) as fats_g,
          COALESCE(p.carbs_g, 0) as carbs_g
         FROM favorite_products fp
         INNER JOIN products p ON fp.product_id = p.id
         WHERE fp.user_id = $1 AND p.id IS NOT NULL`,
        [req.user.id]
      );
      favoriteProducts = favoriteResult.rows;
    } catch (err) {
      console.log('Ошибка загрузки любимых продуктов:', err.message);
    }
    
    // Формируем ответ
    const responseData = {
      email: user.email || '',
      phone: user.phone || '',
      status: user.status || '',
      gender: profile.gender || null,
      age: profile.age ? Number(profile.age) : null,
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
      goal: profile.goal || null,
      activity_level: profile.activity_level || null,
      daily_calorie_norm: profile.daily_calorie_norm ? Number(profile.daily_calorie_norm) : null,
      dislikedProducts: dislikedProducts,
      favoriteProducts: favoriteProducts
    };
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (err) {
    console.error('GET /api/profile error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Ошибка загрузки профиля'
    });
  }
});

router.get('/bmi', authenticate, async (req, res) => {
  try {
    const profileResult = await pool.query(
      'SELECT height_cm, weight_kg FROM profiles WHERE user_id = $1',
      [req.user.id],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден',
      });
    }

    const profile = profileResult.rows[0];

    if (!profile.height_cm || !profile.weight_kg) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных',
      });
    }

    const heightM = Number(profile.height_cm) / 100;
    const weight = Number(profile.weight_kg);
    const bmi = weight / (heightM * heightM);
    
    let category = '';
    let color = '';
    
    if (bmi < 18.5) {
      category = 'Недостаточный вес';
      color = 'yellow';
    } else if (bmi < 25) {
      category = 'Норма';
      color = 'green';
    } else if (bmi < 30) {
      category = 'Избыточный вес';
      color = 'orange';
    } else {
      category = 'Ожирение';
      color = 'red';
    }

    res.json({
      success: true,
      data: {
        bmi: Math.round(bmi * 10) / 10,
        category: category,
        color: color
      }
    });
  } catch (err) {
    console.error('GET /api/profile/bmi error:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при расчёте ИМТ',
    });
  }
});

router.get('/metrics', authenticate, async (req, res) => {
  try {
    const profileResult = await pool.query(
      'SELECT height_cm, weight_kg, age, gender, goal, daily_calorie_norm FROM profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден',
      });
    }

    const profile = profileResult.rows[0];
    const metrics = {
      height_cm: profile.height_cm ? Number(profile.height_cm) : null,
      weight_kg: profile.weight_kg ? Number(profile.weight_kg) : null,
      age: profile.age ? Number(profile.age) : null,
      gender: profile.gender,
      goal: profile.goal,
      daily_calorie_norm: profile.daily_calorie_norm ? Number(profile.daily_calorie_norm) : null,
    };

    if (profile.height_cm && profile.weight_kg) {
      const heightM = Number(profile.height_cm) / 100;
      const weight = Number(profile.weight_kg);
      const bmi = weight / (heightM * heightM);
      metrics.bmi = Math.round(bmi * 10) / 10;
      
      if (bmi < 18.5) metrics.bmiCategory = 'Недостаточный вес';
      else if (bmi < 25) metrics.bmiCategory = 'Норма';
      else if (bmi < 30) metrics.bmiCategory = 'Избыточный вес';
      else metrics.bmiCategory = 'Ожирение';
    }

    res.json({
      success: true,
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

router.get('/calories', authenticate, async (req, res) => {
  try {
    const profileResult = await pool.query(
      `SELECT gender, age, height_cm, weight_kg, goal 
       FROM profiles 
       WHERE user_id = $1`,
      [req.user.id],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Профиль не найден',
      });
    }

    const profile = profileResult.rows[0];

    if (!profile.gender || !profile.age || !profile.height_cm || !profile.weight_kg || !profile.goal) {
      return res.status(400).json({
        success: false,
        error: 'Недостаточно данных',
      });
    }

    const activityLevel = req.query.activityLevel ? parseFloat(req.query.activityLevel) : 1.2;
    
    const height = Number(profile.height_cm);
    const weight = Number(profile.weight_kg);
    const age = Number(profile.age);
    
    let bmr = 10 * weight + 6.25 * height - 5 * age;
    bmr = profile.gender === 'Ж' ? bmr - 161 : bmr + 5;
    
    const tdee = Math.round(bmr * activityLevel);
    
    let goalMultiplier = 1;
    if (profile.goal === 'Снижение веса') goalMultiplier = 0.8;
    if (profile.goal === 'Набор массы') goalMultiplier = 1.15;
    
    const dailyCalorieNorm = Math.round(tdee * goalMultiplier);

    res.json({
      success: true,
      data: {
        bmr: Math.round(bmr),
        tdee: tdee,
        dailyCalorieNorm: dailyCalorieNorm,
        activityLevel: activityLevel
      }
    });
  } catch (err) {
    console.error('GET /api/profile/calories error:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка при расчёте нормы калорий',
    });
  }
});

// ========== GET /api/products/search ==========
router.get('/search', authenticate, async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Не указано название продукта'
      });
    }
    
    // Ищем продукт по названию (частичное совпадение)
    const result = await pool.query(
      `SELECT id, name, calories_kcal, proteins_g, fats_g, carbs_g 
       FROM products 
       WHERE LOWER(name) = LOWER($1) OR LOWER(name) LIKE LOWER($2)
       LIMIT 1`,
      [name, `%${name}%`]
    );
    
    if (result.rows.length === 0) {
      return res.json({
        success: false,
        error: 'Продукт не найден'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (err) {
    console.error('Ошибка поиска продукта:', err);
    res.status(500).json({
      success: false,
      error: 'Ошибка поиска продукта'
    });
  }
});

router.post('/', authenticate, async (req, res) => {
    try {
        const { name, calories_kcal, proteins_g, fats_g, carbs_g } = req.body;

        console.log('Создание/поиск продукта:', { name, userId: req.user.id });

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Название продукта обязательно'
            });
        }

        // 1. Сначала ищем продукт в БД (без учета регистра)
        const existing = await pool.query(
            'SELECT id, name, calories_kcal, proteins_g, fats_g, carbs_g FROM products WHERE LOWER(name) = LOWER($1)',
            [name.trim()]
        );

        // 2. Если продукт уже существует, просто возвращаем его
        if (existing.rows.length > 0) {
            console.log('Продукт уже существует, возвращаем:', existing.rows[0]);
            return res.json({
                success: true,
                data: existing.rows[0],
                message: 'Продукт уже существует'
            });
        }

        // 3. Если продукта нет, создаем новый
        const result = await pool.query(
            `INSERT INTO products (id, name, calories_kcal, proteins_g, fats_g, carbs_g, is_custom, user_id)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, calories_kcal, proteins_g, fats_g, carbs_g`,
            [name.trim(), calories_kcal || 0, proteins_g || 0, fats_g || 0, carbs_g || 0, true, req.user.id]
        );

        console.log('Создан новый продукт:', result.rows[0]);

        res.json({
            success: true,
            data: result.rows[0],
            message: 'Продукт создан'
        });

    } catch (err) {
        console.error('POST /api/products error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка создания продукта'
        });
    }
});

router.get('/search', authenticate, async (req, res) => {
    try {
        const { name } = req.query;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Не указано название продукта'
            });
        }

        const result = await pool.query(
            `SELECT id, name, calories_kcal, proteins_g, fats_g, carbs_g 
       FROM products 
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
            [name.trim()]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: false,
                error: 'Продукт не найден'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        console.error('GET /api/products/search error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка поиска продукта'
        });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, calories_kcal, proteins_g, fats_g, carbs_g 
       FROM products 
       ORDER BY name`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        console.error('GET /api/products error:', err);
        res.status(500).json({
            success: false,
            error: 'Ошибка получения продуктов'
        });
    }
});


module.exports = router;