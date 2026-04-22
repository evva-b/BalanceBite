import { useState } from 'react';

interface ProfileData {
    gender: 'M' | 'Ж';
    age: number;
    height_cm: number;
    weight_kg: number;
    goal: string;
    activity_level?: 'minimal' | 'moderate' | 'high';
    email?: string;
    phone?: string;
    status?: string;
    dislikedProducts?: string[];
    favoriteProductIds?: string[];
}

interface FavoriteProduct {
    id: string;
    name: string;
    calories_kcal: number;
    proteins_g: number;
    fats_g: number;
    carbs_g: number;
}

interface ProfileResponse {
    success: boolean;
    data: {
        email: string;
        phone: string;
        status: string;
        gender: 'M' | 'Ж';
        age: number;
        height_cm: number;
        weight_kg: number;
        goal: string;
        activity_level: 'minimal' | 'moderate' | 'high';
        daily_calorie_norm: number;
        bmi?: number;
        bmiCategory?: string;
        dislikedProducts: string[];
        favoriteProducts: FavoriteProduct[];
    };
}

interface SaveResult {
    success: boolean;
    errors?: Record<string, string>;
    data?: {
        daily_calorie_norm: number;
        calculated: boolean;
    };
}

export const useProfileAPI = () => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const loadProfile = async (): Promise<ProfileResponse['data'] | null> => {
        try {
            const response = await fetch('http://localhost:3001/api/profile', {
                credentials: 'include'
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }

            if (response.ok) {
                const result: ProfileResponse = await response.json();
                return result.data;
            }

            if (response.status === 404) {
                console.log('Профиль не создан');
            }
            return null;
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            return null;
        }
    };

    const saveProfile = async (data: ProfileData): Promise<SaveResult> => {
        setLoading(true);
        setErrors({});

        try {
            const response = await fetch('http://localhost:3001/api/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return { success: false, errors: { general: 'Требуется авторизация' } };
            }

            const result = await response.json();

            if (!response.ok && result.details) {
                const fieldErrors: Record<string, string> = {};
                result.details.forEach((err: string) => {
                    if (err.includes('Рост')) fieldErrors.height_cm = err;
                    if (err.includes('Вес')) fieldErrors.weight_kg = err;
                    if (err.includes('Возраст')) fieldErrors.age = err;
                });
                setErrors(fieldErrors);
                return { success: false, errors: fieldErrors };
            }

            if (response.ok) {
                return {
                    success: true,
                    data: {
                        daily_calorie_norm: result.data?.daily_calorie_norm || 0,
                        calculated: result.data?.calculated || false
                    }
                };
            }

            return { success: false, errors: { general: 'Ошибка сохранения' } };
        } catch (error) {
            console.error('Ошибка:', error);
            return { success: false, errors: { general: 'Ошибка соединения' } };
        } finally {
            setLoading(false);
        }
    };
    const getMetrics = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/profile/metrics', {
                credentials: 'include'
            });
            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Ошибка загрузки метрик:', error);
            return null;
        }
    };

    const getBMI = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/profile/bmi', {
                credentials: 'include'
            });
            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Ошибка расчета ИМТ:', error);
            return null;
        }
    };

    return { loadProfile, saveProfile, getMetrics, getBMI, loading, errors };
};