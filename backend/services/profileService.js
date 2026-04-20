const pool = require('../db');

class ProfileService {
  /**
   * Получить профиль пользователя
   * @param {string} userId - UUID пользователя
   */
  async getProfileByUserId(userId) {
    try {
      const query = `
        SELECT id, user_id, gender, age, height_cm, weight_kg, goal, daily_calorie_norm, created_at, updated_at
        FROM profiles
        WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in getProfileByUserId:', error);
      throw error;
    }
  }

  /**
   * Создать или обновить профиль пользователя
   * @param {string} userId - UUID пользователя
   * @param {object} profileData - данные профиля {height_cm, weight_kg, age}
   */
  async saveProfile(userId, profileData) {
    const { height_cm, weight_kg, age } = profileData;

    try {
      // Проверяем, существует ли уже профиль
      const existingProfile = await this.getProfileByUserId(userId);

      if (existingProfile) {
        // Обновляем существующий профиль
        const query = `
          UPDATE profiles
          SET 
            height_cm = COALESCE($1, height_cm),
            weight_kg = COALESCE($2, weight_kg),
            age = COALESCE($3, age),
            updated_at = NOW()
          WHERE user_id = $4
          RETURNING id, user_id, gender, age, height_cm, weight_kg, goal, daily_calorie_norm, created_at, updated_at
        `;

        const result = await pool.query(query, [height_cm, weight_kg, age, userId]);
        return { profile: result.rows[0], action: 'updated' };
      } else {
        // Создаём новый профиль
        const query = `
          INSERT INTO profiles (user_id, height_cm, weight_kg, age, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id, user_id, gender, age, height_cm, weight_kg, goal, daily_calorie_norm, created_at, updated_at
        `;

        const result = await pool.query(query, [userId, height_cm, weight_kg, age]);
        return { profile: result.rows[0], action: 'created' };
      }
    } catch (error) {
      console.error('Error in saveProfile:', error);
      throw error;
    }
  }

  /**
   * Получить конкретные метрики пользователя
   */
  async getUserMetrics(userId) {
    try {
      const profile = await this.getProfileByUserId(userId);

      if (!profile) {
        return null;
      }

      // Рассчитываем дополнительные метрики
      const metrics = {
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        age: profile.age,
        bmi: this.calculateBMI(profile.weight_kg, profile.height_cm),
      };

      return metrics;
    } catch (error) {
      console.error('Error in getUserMetrics:', error);
      throw error;
    }
  }

  /**
   * Рассчитать индекс массы тела (ИМТ)
   * BMI = weight (kg) / (height (m))^2
   */
  calculateBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;

    const heightM = Number(heightCm) / 100;
    const bmi = Number(weightKg) / (heightM * heightM);

    return parseFloat(bmi.toFixed(1));
  }
}

module.exports = new ProfileService();
