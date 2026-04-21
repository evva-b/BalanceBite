import React from 'react';
import type { ChangeEvent } from 'react';

interface MetricsData {
    bmi: number | null;
    bmiCategory: string;
    idealWeight: string;
    bmr: string;
}

interface FormData {
    age: number | string;
    height_cm: number | string;
    weight_kg: number | string;
    gender: 'male' | 'female';
}

interface ProfileMetricsProps {
    metrics: MetricsData;
    formData: FormData;
    errors: Record<string, string>;
    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onGenderChange: (gender: 'male' | 'female') => void;
}

export const ProfileMetrics: React.FC<ProfileMetricsProps> = ({
    metrics,
    formData,
    errors,
    onInputChange,
    onGenderChange
}) => {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="text-[#58B079] font-bold text-lg mb-4">Мои показатели</h3>
            <div className="space-y-3">
                {/* Пол */}
                <div className="flex items-center gap-4">
                    <span className="text-[#22241E] w-16">Пол:</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onGenderChange('male')}
                            className={`px-4 py-1 rounded-full transition-all ${formData.gender === 'male'
                                    ? 'bg-[#D974E6] text-white'
                                    : 'bg-[#F0F0F0] text-[#22241E]'
                                }`}
                        >
                            М
                        </button>
                        <button
                            type="button"
                            onClick={() => onGenderChange('female')}
                            className={`px-4 py-1 rounded-full transition-all ${formData.gender === 'female'
                                    ? 'bg-[#D974E6] text-white'
                                    : 'bg-[#F0F0F0] text-[#22241E]'
                                }`}
                        >
                            Ж
                        </button>
                    </div>
                    <span className="text-[#D974E6]">*</span>
                    {/* ИМТ */}
                    <span className="ml-auto text-[16px] text-[#22241E]">
                        ИМТ: <span className="font-bold">{metrics.bmi ? `${metrics.bmi} (${metrics.bmiCategory})` : '—'}</span>
                    </span>
                </div>

                {/* Возраст */}
                <div>
                    <div className="flex items-center gap-4">
                        <span className="text-[#22241E] w-16">Возраст:</span>
                        <input
                            type="number"
                            name="age"
                            value={formData.age || ''}
                            onChange={onInputChange}
                            className="w-24 px-3 py-1 bg-[#F0F0F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#58B079]"
                            placeholder="25"
                        />
                        <span className="text-[#D974E6]">*</span>
                        <span className="ml-auto text-[16px] text-[#22241E]">Идеальный вес: {metrics.idealWeight || '—'} кг</span>
                    </div>
                    {/* Ошибка для возраста */}
                    {errors.age && <span className="text-red-500 text-xs ml-20 block mt-1">{errors.age}</span>}
                </div>

                {/* Рост */}
                <div>
                    <div className="flex items-center gap-4">
                        <span className="text-[#22241E] w-16">Рост:</span>
                        <input
                            type="number"
                            name="height_cm"
                            value={formData.height_cm || ''}
                            onChange={onInputChange}
                            className="w-24 px-3 py-1 bg-[#F0F0F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#58B079]"
                            placeholder="175"
                        />
                        <span className="text-[#D974E6]">*</span>
                        <span className="ml-auto text-[16px] text-[#22241E]">Осн.обмен: {metrics.bmr || '—'} ккал</span>
                    </div>
                    {/* Ошибка для роста */}
                    {errors.height_cm && <span className="text-red-500 text-xs ml-20 block mt-1">{errors.height_cm}</span>}
                </div>

                {/* Вес */}
                <div>
                    <div className="flex items-center gap-4">
                        <span className="text-[#22241E] w-16">Вес:</span>
                        <input
                            type="number"
                            name="weight_kg"
                            value={formData.weight_kg || ''}
                            onChange={onInputChange}
                            className="w-24 px-3 py-1 bg-[#F0F0F0] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#58B079]"
                            placeholder="70"
                        />
                        <span className="text-[#D974E6]">*</span>
                    </div>
                    {/* Ошибка для веса */}
                    {errors.weight_kg && <span className="text-red-500 text-xs ml-20 block mt-1">{errors.weight_kg}</span>}
                </div>
            </div>
        </div>
    );
};