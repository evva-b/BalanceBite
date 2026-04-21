import { useState } from 'react';

interface ProfileData {
    gender: 'male' | 'female';
    age: number;
    height_cm: number;
    weight_kg: number;
    goal: string;
}

interface ProfileResponse {
    id?: string;
    user_id?: string;
    gender: 'male' | 'female';
    age: number;
    height_cm: number;
    weight_kg: number;
    goal: string;
    bmi?: number;
    daily_calorie_norm?: number;
}

interface SaveResult {
    success: boolean;
    errors?: Record<string, string>;
    data?: ProfileResponse;
}

export const useProfileAPI = () => {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const loadProfile = async (): Promise<ProfileResponse | null> => {
        try {
            const response = await fetch('http://localhost:3001/api/profile', {
                credentials: 'include'
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }

            if (response.ok) {
                const data: ProfileResponse = await response.json();
                return data;
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
                return { success: true, data: result };
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