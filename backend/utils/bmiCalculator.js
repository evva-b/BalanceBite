/**
 * Расчёт индекса массы тела (ИМТ/BMI)
 * @param {number} weightKg - вес в килограммах
 * @param {number} heightCm - рост в сантиметрах
 * @returns {object} Результат расчёта
 */
const calculateBMI = (weightKg, heightCm) => {
  // Валидация входных данных
  if (!weightKg || !heightCm) {
    return {
      success: false,
      error: 'Недостаточно данных для расчёта ИМТ',
      details: ['Необходимо указать вес (weight_kg) и рост (height_cm)'],
    };
  }

  const weight = Number(weightKg);
  const height = Number(heightCm);

  if (isNaN(weight) || isNaN(height)) {
    return {
      success: false,
      error: 'Некорректные данные',
      details: ['Вес и рост должны быть числами'],
    };
  }

  if (weight <= 0 || height <= 0) {
    return {
      success: false,
      error: 'Некорректные данные',
      details: ['Вес и рост должны быть положительными числами'],
    };
  }

  // Формула: BMI = weight (kg) / (height (m))^2
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const bmiRounded = parseFloat(bmi.toFixed(1));

  // Определение категории
  const category = getBMICategory(bmiRounded);

  // Рекомендации
  const recommendations = getRecommendations(category);

  return {
    success: true,
    data: {
      bmi: bmiRounded,
      category: category.name,
      categoryCode: category.code,
      color: category.color,
      healthyWeightRange: getHealthyWeightRange(height),
      recommendations,
    },
  };
};

/**
 * Определение категории ИМТ по ВОЗ
 */
const getBMICategory = (bmi) => {
  if (bmi < 16) {
    return {
      name: 'Выраженный дефицит массы тела',
      code: 'severe_underweight',
      color: 'red',
    };
  } else if (bmi < 17) {
    return {
      name: 'Умеренный дефицит массы тела',
      code: 'moderate_underweight',
      color: 'orange',
    };
  } else if (bmi < 18.5) {
    return {
      name: 'Лёгкий дефицит массы тела',
      code: 'mild_underweight',
      color: 'yellow',
    };
  } else if (bmi < 25) {
    return {
      name: 'Норма',
      code: 'normal',
      color: 'green',
    };
  } else if (bmi < 30) {
    return {
      name: 'Избыточная масса тела (предожирение)',
      code: 'overweight',
      color: 'orange',
    };
  } else if (bmi < 35) {
    return {
      name: 'Ожирение I степени',
      code: 'obesity_class_1',
      color: 'red',
    };
  } else if (bmi < 40) {
    return {
      name: 'Ожирение II степени',
      code: 'obesity_class_2',
      color: 'red',
    };
  } else {
    return {
      name: 'Ожирение III степени (морбидное)',
      code: 'obesity_class_3',
      color: 'darkred',
    };
  }
};

/**
 * Рекомендации по категории
 */
const getRecommendations = (category) => {
  const recommendations = {
    severe_underweight: [
      'Необходима консультация врача',
      'Увеличьте калорийность рациона',
      'Добавьте силовые тренировки',
    ],
    moderate_underweight: [
      'Рекомендуется увеличить потребление калорий',
      'Сбалансируйте питание',
      'Добавьте белковые продукты',
    ],
    mild_underweight: [
      'Слегка увеличьте калорийность питания',
      'Следите за режимом питания',
      'Добавьте полезные перекусы',
    ],
    normal: [
      'Поддерживайте текущий образ жизни',
      'Продолжайте сбалансированно питаться',
      'Регулярная физическая активность',
    ],
    overweight: [
      'Снизьте потребление простых углеводов',
      'Увеличьте физическую активность',
      'Контролируйте размер порций',
    ],
    obesity_class_1: [
      'Рекомендуется консультация диетолога',
      'Снизьте калорийность рациона на 500-750 ккал',
      'Регулярные кардиотренировки',
    ],
    obesity_class_2: [
      'Необходима консультация врача',
      'Составьте план снижения веса со специалистом',
      'Увеличьте физическую активность постепенно',
    ],
    obesity_class_3: [
      'Срочная консультация врача обязательна',
      'Комплексный подход под наблюдением специалистов',
      'Возможно рассмотрение медицинских методов лечения',
    ],
  };

  return recommendations[category.code] || ['Нет рекомендаций'];
};

/**
 * Расчёт здорового диапазона веса для данного роста
 * BMI 18.5 - 24.9 считается нормой
 */
const getHealthyWeightRange = (heightCm) => {
  const heightM = heightCm / 100;
  const minWeight = 18.5 * (heightM * heightM);
  const maxWeight = 24.9 * (heightM * heightM);

  return {
    min: parseFloat(minWeight.toFixed(1)),
    max: parseFloat(maxWeight.toFixed(1)),
    unit: 'кг',
  };
};

/**
 * Интерпретация ИМТ (текстовое описание)
 */
const interpretBMI = (bmi) => {
  const result = calculateBMI(bmi, 100); // height не важен для интерпретации
  if (!result.success) return result;

  return {
    success: true,
    data: {
      bmi: result.data.bmi,
      category: result.data.category,
      interpretation: `Ваш ИМТ составляет ${result.data.bmi}, что соответствует категории: ${result.data.category}`,
    },
  };
};

module.exports = {
  calculateBMI,
  getBMICategory,
  getHealthyWeightRange,
  interpretBMI,
};
