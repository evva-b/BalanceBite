const fetch = require('node-fetch');
const pool = require('../db');

const USDA_BASE_URL = process.env.USDA_BASE_URL || 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.USDA_API_KEY;

/**
 * Поиск продуктов в USDA
 * @param {string} query - поисковый запрос
 * @param {number} pageSize - количество результатов (max 50)
 */
async function searchProducts(query, pageSize = 20) {
  try {
    const url = `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=${pageSize}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.foods || data.foods.length === 0) {
      return [];
    }

    // Сохраняем найденные продукты в кэш
    const cachedProducts = await cacheUSDAProducts(data.foods);

    return cachedProducts;
  } catch (error) {
    console.error('USDA search error:', error);
    throw new Error('Ошибка поиска в базе USDA');
  }
}

/**
 * Получить детали продукта по FDC ID
 */
async function getProductDetails(fdcId) {
  try {
    // Сначала пробуем найти в кэше
    const cached = await pool.query('SELECT * FROM usda_products WHERE fdc_id = $1', [fdcId]);

    if (cached.rows.length > 0) {
      return cached.rows[0];
    }

    // Если нет в кэше — запрашиваем из API
    const url = `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}&nutrients=203,204,205,208`;
    const response = await fetch(url);
    const foodData = await response.json();

    // Сохраняем в кэш
    const product = await saveUSDAProduct(foodData);
    return product;
  } catch (error) {
    console.error('USDA get details error:', error);
    throw new Error('Ошибка получения данных продукта');
  }
}

/**
 * Сохранить продукты из USDA в локальный кэш
 */
async function cacheUSDAProducts(foods) {
  const products = [];

  for (const food of foods) {
    const product = await saveUSDAProduct(food);
    products.push(product);
  }

  return products;
}

/**
 * Сохранить один продукт USDA
 */
async function saveUSDAProduct(foodData) {
  // Извлекаем нутриенты
  const nutrients = {};
  if (foodData.foodNutrients) {
    for (const nutrient of foodData.foodNutrients) {
      nutrients[nutrient.nutrient.number] = nutrient.amount;
    }
  }

  // 203 = Protein, 204 = Total lipid (fat), 205 = Carbohydrate, 208 = Energy
  const product = {
    fdc_id: foodData.fdcId,
    name: foodData.description || foodData.foodName,
    calories_kcal: nutrients['208'] || null,
    proteins_g: nutrients['203'] || null,
    fats_g: nutrients['204'] || null,
    carbs_g: nutrients['205'] || null,
    serving_size_g: foodData.servingSize || null,
    food_category: foodData.foodCategory || null,
    brand_owner: foodData.brandOwner || null,
    ingredients: foodData.ingredients || null,
  };

  // INSERT или UPDATE (если уже есть)
  const result = await pool.query(
    `INSERT INTO usda_products (fdc_id, name, calories_kcal, proteins_g, fats_g, carbs_g, serving_size_g, food_category, brand_owner, ingredients, last_updated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (fdc_id) DO UPDATE SET
       name = EXCLUDED.name,
       calories_kcal = EXCLUDED.calories_kcal,
       proteins_g = EXCLUDED.proteins_g,
       fats_g = EXCLUDED.fats_g,
       carbs_g = EXCLUDED.carbs_g,
       last_updated = NOW()
     RETURNING *`,
    [
      product.fdc_id,
      product.name,
      product.calories_kcal,
      product.proteins_g,
      product.fats_g,
      product.carbs_g,
      product.serving_size_g,
      product.food_category,
      product.brand_owner,
      product.ingredients,
    ],
  );

  return result.rows[0];
}

module.exports = {
  searchProducts,
  getProductDetails,
};
