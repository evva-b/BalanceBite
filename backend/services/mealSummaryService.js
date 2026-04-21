const pool = require('../db');

/**
 * Рассчитать суммарные КБЖУ за конкретный день
 * @param {string} userId - UUID пользователя
 * @param {string} dateStr - Дата в формате YYYY-MM-DD
 * @returns {object} { calories, proteins, fats, carbs }
 */
async function getDailySummary(userId, dateStr) {
  // 🔍 Примечание: запрос предполагает, что:
  // - products хранит КБЖУ на 100г (calories_kcal, proteins_g, fats_g, carbs_g)
  // - meal_entries хранит вес в граммах (weight_g)
  // Если у тебя другие названия колонок, поправь их в запросе ниже.
  const query = `
    SELECT 
      COALESCE(SUM(p.calories_kcal * me.weight_g / 100.0), 0) as calories,
      COALESCE(SUM(p.proteins_g * me.weight_g / 100.0), 0) as proteins,
      COALESCE(SUM(p.fats_g * me.weight_g / 100.0), 0) as fats,
      COALESCE(SUM(p.carbs_g * me.weight_g / 100.0), 0) as carbs
    FROM meal_entries me
    JOIN meals m ON me.meal_id = m.id
    JOIN products p ON me.product_id = p.id
    WHERE m.user_id = $1 AND m.date = $2
  `;

  const result = await pool.query(query, [userId, dateStr]);
  return result.rows[0];
}

module.exports = { getDailySummary };
