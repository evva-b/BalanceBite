import { useState } from 'react';

interface ValidationErrors {
    height_cm?: string;
    weight_kg?: string;
    age?: string;
}

interface FormData {
    height_cm: number | string;
    weight_kg: number | string;
    age: number | string;
}

export const useProfileValidation = () => {
    const [errors, setErrors] = useState<ValidationErrors>({});

    const validateRequiredFields = (formData: FormData): boolean => {
        const newErrors: ValidationErrors = {};

        if (!formData.height_cm) {
            newErrors.height_cm = 'Рост обязателен для заполнения';
        } else if (Number(formData.height_cm) < 100 || Number(formData.height_cm) > 250) {
            newErrors.height_cm = 'Рост должен быть в диапазоне от 100 до 250 см';
        }

        if (!formData.weight_kg) {
            newErrors.weight_kg = 'Вес обязателен для заполнения';
        } else if (Number(formData.weight_kg) < 30 || Number(formData.weight_kg) > 250) {
            newErrors.weight_kg = 'Вес должен быть в диапазоне от 30 до 250 кг';
        }

        if (!formData.age) {
            newErrors.age = 'Возраст обязателен для заполнения';
        } else if (Number(formData.age) < 16 || Number(formData.age) > 120) {
            newErrors.age = 'Возраст должен быть в диапазоне от 16 до 120 лет';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const setApiErrors = (apiErrors: Record<string, string>) => {
        setErrors(apiErrors);
    };

    const clearErrors = () => {
        setErrors({});
    };

    return {
        errors,
        validateRequiredFields,
        setApiErrors,
        clearErrors
    };
};