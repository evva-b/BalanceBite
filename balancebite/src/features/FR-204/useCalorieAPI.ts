import { useState } from 'react';

interface CalorieData {
    dailyCalorieNorm: number;
    bmr: number;
}

interface CalorieResponse {
    success: boolean;
    data: {
        bmr: number;
        tdee: number;
        dailyCalorieNorm: number;
        activityLevel: number;
        activityLevelName: string;
        goal: string;
        goalMultiplier: number;
        weeklyWeightChange: {
            kg: number;
            description: string;
        };
        recommendations: string[];
    };
}

export const useCalorieAPI = () => {
    const [calorieData, setCalorieData] = useState<CalorieData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchCalories = async (activityLevel: string): Promise<CalorieData | null> => {
        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost:3001/api/profile/calories?activityLevel=${activityLevel}`,
                { credentials: 'include' }
            );

            if (response.ok) {
                const data: CalorieResponse = await response.json();
                const result: CalorieData = {
                    dailyCalorieNorm: data.data.dailyCalorieNorm,
                    bmr: data.data.bmr
                };
                setCalorieData(result);
                return result;
            }
        } catch (error) {
            console.error('Ошибка расчета калорий:', error);
        } finally {
            setLoading(false);
        }
        return null;
    };

    return { fetchCalories, calorieData, loading };
};