const normalizeGoal = (goal) => {
  if (!goal) return 'maintenance'; // дефолт на английском

  const g = String(goal).trim().toLowerCase();

  // 🔹 Русские варианты → английский код
  if (g.includes('сниж') || g.includes('худ') || g.includes('lose') || g === 'weight_loss') {
    return 'weight_loss';
  }
  if (g.includes('набор') || g.includes('масс') || g.includes('gain') || g === 'muscle_gain') {
    return 'muscle_gain';
  }
  // 🔹 Английские коды или дефолт
  if (g === 'maintenance' || g.includes('поддерж') || g.includes('norm')) {
    return 'maintenance';
  }

  return 'maintenance';
};

/**
 * Расчёт суточной нормы калорий по формуле Миффлина-Сан Жеора
 */
const calculateCalorieNorm = ({
  weightKg,
  heightCm,
  age,
  gender,
  goal = 'Поддержание веса',
  activityLevel = 1.2,
}) => {
  const normalizedGoal = normalizeGoal(goal);

  // Валидация
  const errors = [];
  if (!weightKg || weightKg < 30 || weightKg > 250)
    errors.push('Вес должен быть в диапазоне 30-250 кг');
  if (!heightCm || heightCm < 100 || heightCm > 250)
    errors.push('Рост должен быть в диапазоне 100-250 см');
  if (!age || age < 16 || age > 120) errors.push('Возраст должен быть в диапазоне 16-120 лет');
  if (!gender || !['male', 'female'].includes(String(gender).toLowerCase()))
    errors.push('Пол должен быть указан (male/female)');

  if (errors.length > 0) {
    return { success: false, error: 'Недостаточно данных', details: errors };
  }

  const w = Number(weightKg);
  const h = Number(heightCm);
  const a = Number(age);
  const g = String(gender).toLowerCase();

  // 🔥 BMR (Mifflin-St Jeor)
  let bmr = 10 * w + 6.25 * h - 5 * a;
  bmr = g === 'female' ? bmr - 161 : bmr + 5;

  // 🔥 TDEE
  const tdee = bmr * activityLevel;

  // 🔥 Корректировка по цели
  const goalMultipliers = {
    weight_loss: 0.8, // Снижение веса
    maintenance: 1.0, // Поддержание веса
    muscle_gain: 1.15, // Набор массы
  };

  const goalMultiplier = goalMultipliers[normalizedGoal] ?? 1.0;
  const dailyCalorieNorm = Math.round(tdee * goalMultiplier);
  const weeklyWeightChange = calculateWeeklyWeightChange(tdee, normalizedGoal);

  return {
    success: true,
    data: {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      dailyCalorieNorm,
      activityLevel,
      activityLevelName: getActivityLevelName(activityLevel),
      goal: normalizedGoal,
      goalMultiplier,
      weeklyWeightChange,
      breakdown: {
        formula: 'Mifflin-St Jeor',
        calculation: `BMR = ${g === 'female' ? '10×вес + 6.25×рост - 5×возраст - 161' : '10×вес + 6.25×рост - 5×возраст + 5'}`,
        bmrCalculation: `BMR = ${Math.round(bmr)} ккал`,
        tdeeCalculation: `TDEE = BMR × ${activityLevel} = ${Math.round(tdee)} ккал`,
        goalCalculation: `Цель "${normalizedGoal}" → × ${goalMultiplier} = ${dailyCalorieNorm} ккал/день`,
      },
      // 🔥 Встроенные рекомендации (вместо отдельной функции)
      recommendations: getCalorieRecommendations(normalizedGoal),
    },
  };
};

/**
 * Получить название уровня активности
 */
const getActivityLevelName = (level) => {
  const levels = {
    1.2: 'Минимальная (сидячий образ жизни)',
    1.375: 'Низкая (лёгкие тренировки 1-3 раза/неделю)',
    1.55: 'Средняя (тренировки 3-5 раз/неделю)',
    1.725: 'Высокая (интенсивные тренировки 6-7 раз/неделю)',
    1.9: 'Очень высокая (физическая работа + тренировки)',
  };

  const closest = Object.keys(levels)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - level) < Math.abs(prev - level) ? curr : prev));

  return levels[closest] || 'Неизвестный уровень';
};

/**
 * Рассчитать ожидаемое изменение веса за неделю
 */
const calculateWeeklyWeightChange = (tdee, goal) => {
  const CALORIES_PER_KG = 7700;
  const multipliers = { 'Снижение веса': -0.2, 'Поддержание веса': 0, 'Набор массы': 0.15 };
  const deficit = tdee * (multipliers[goal] ?? 0);
  const weeklyDeficit = deficit * 7;
  const weightChange = weeklyDeficit / CALORIES_PER_KG;

  return {
    kg: parseFloat(weightChange.toFixed(2)),
    description:
      weightChange > 0.1
        ? `+${weightChange.toFixed(1)} кг/неделю (набор)`
        : weightChange < -0.1
          ? `${weightChange.toFixed(1)} кг/неделю (снижение)`
          : 'Стабильный вес',
  };
};

/**
 * 🔥 РЕКОМЕНДАЦИИ (встроены в модуль)
 */
const getCalorieRecommendations = (goal) => {
  const recs = {
    'Снижение веса': [
      'Не снижайте калорийность ниже 1200 ккал (жен) / 1500 ккал (муж)',
      'Сочетайте дефицит калорий с силовыми тренировками',
      'Пейте достаточно воды (30-35 мл на 1 кг веса)',
    ],
    'Набор массы': [
      'Увеличивайте калорийность постепенно (+100-200 ккал/неделю)',
      'Убедитесь, что потребляете достаточно белка (1.6-2.2 г/кг)',
      'Тренируйтесь с отягощениями для набора мышечной массы',
    ],
    'Поддержание веса': [
      'Поддерживайте текущий баланс калорий',
      'Следите за качеством питания, а не только за калориями',
      'Регулярно пересчитывайте норму при изменении веса',
    ],
  };
  return recs[goal] || recs['Поддержание веса'];
};

module.exports = {
  calculateCalorieNorm,
  getActivityLevelName,
  calculateWeeklyWeightChange,
  normalizeGoal,
  getCalorieRecommendations, // 🔥 Экспортируем!
};
