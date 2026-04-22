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
    gender: 'M' | 'Ж';
}

interface ProfileMetricsProps {
    metrics: MetricsData;
    formData: FormData;
    errors: Record<string, string>;
    onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onGenderChange: (gender: 'M' | 'Ж') => void;
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
                <div className="flex items-center gap-4">
                    <span className="text-[#22241E] w-16">Пол:</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onGenderChange('M')}
                            className={`px-4 py-1 rounded-full transition-all ${formData.gender === 'M'
                                    ? 'bg-[#D974E6] text-white'
                                    : 'bg-[#F0F0F0] text-[#22241E]'
                                }`}
                        >
                            М
                        </button>
                        <button
                            type="button"
                            onClick={() => onGenderChange('Ж')}
                            className={`px-4 py-1 rounded-full transition-all ${formData.gender === 'Ж'
                                    ? 'bg-[#D974E6] text-white'
                                    : 'bg-[#F0F0F0] text-[#22241E]'
                                }`}
                        >
                            Ж
                        </button>
                    </div>
                    <span className="text-[#D974E6]">*</span>
                </div>

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
                    {errors.age && <span className="text-red-500 text-sm">{errors.age}</span>}
                </div>

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
                    {errors.height_cm && <span className="text-red-500 text-sm">{errors.height_cm}</span>}
                </div>
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
                    {errors.weight_kg && <span className="text-red-500 text-sm">{errors.weight_kg}</span>}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[#22241E] w-16">ИМТ:</span>
                    <span className="text-[#22241E]">
                        {metrics.bmi ? `${metrics.bmi} (${metrics.bmiCategory})` : '—'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[#22241E] w-16">Идеальный вес:</span>
                    <span className="text-[#22241E]">{metrics.idealWeight || '—'}</span>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[#22241E] w-16">Осн.обмен:</span>
                    <span className="text-[#22241E]">{metrics.bmr ? `${metrics.bmr} ккал` : '—'}</span>
                </div>
            </div>
        </div>
    );
};