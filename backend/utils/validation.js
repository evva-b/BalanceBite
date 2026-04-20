/**
 * Валидация числовых полей профиля
 * @param {number} value - значение для проверки
 * @param {number} min - минимальное значение
 * @param {number} max - максимальное значение
 * @param {string} fieldName - имя поля для ошибки
 */
const validateNumberField = (value, min, max, fieldName) => {
  const errors = [];

  // Проверка на наличие
  if (value === undefined || value === null || value === '') {
    errors.push(`${fieldName} является обязательным полем`);
    return errors;
  }

  // Проверка на число
  const numValue = Number(value);
  if (isNaN(numValue)) {
    errors.push(`${fieldName} должен быть числом`);
    return errors;
  }

  // Проверка на положительное число
  if (numValue <= 0) {
    errors.push(`${fieldName} должен быть положительным числом`);
    return errors;
  }

  // Проверка диапазона
  if (numValue < min || numValue > max) {
    errors.push(`${fieldName} должен быть в диапазоне от ${min} до ${max}`);
  }

  // Проверка на дробное число (если нужно целое)
  if (!Number.isInteger(numValue)) {
    errors.push(`${fieldName} должен быть целым числом`);
  }

  return errors;
};

/**
 * Валидация веса (кг)
 * Допустимый диапазон: 20-300 кг
 */
const validateWeight = (weight) => {
  return validateNumberField(weight, 20, 300, 'Вес');
};

/**
 * Валидация роста (см)
 * Допустимый диапазон: 50-250 см
 */
const validateHeight = (height) => {
  return validateNumberField(height, 50, 250, 'Рост');
};

/**
 * Валидация возраста (лет)
 * Допустимый диапазон: 5-120 лет
 */
const validateAge = (age) => {
  return validateNumberField(age, 5, 120, 'Возраст');
};

/**
 * Комплексная валидация профиля
 */
const validateProfileData = (data) => {
  const errors = [];

  const { height, weight, age } = data;

  // Валидируем каждое поле
  if (height !== undefined && height !== null) {
    errors.push(...validateHeight(height));
  }

  if (weight !== undefined && weight !== null) {
    errors.push(...validateWeight(weight));
  }

  if (age !== undefined && age !== null) {
    errors.push(...validateAge(age));
  }

  return errors;
};

module.exports = {
  validateNumberField,
  validateWeight,
  validateHeight,
  validateAge,
  validateProfileData,
};
