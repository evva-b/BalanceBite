const { validateProfileData } = require('../utils/validation');

/**
 * Middleware для валидации данных профиля
 * Проверяет поля: рост, вес, возраст
 */
const validateProfile = (req, res, next) => {
  const { height, weight, age } = req.body;

  // Проверяем, есть ли хотя бы одно поле для обновления
  if (height === undefined && weight === undefined && age === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Необходимо указать хотя бы одно из полей: рост, вес или возраст',
      errors: ['Отсутствуют данные для обновления профиля'],
    });
  }

  // Валидируем данные
  const validationErrors = validateProfileData({ height, weight, age });

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации данных',
      errors: validationErrors,
    });
  }

  // Если всё ок, передаём управление дальше
  next();
};

module.exports = validateProfile;
