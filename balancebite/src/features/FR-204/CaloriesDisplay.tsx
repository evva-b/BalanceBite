import React from 'react';

interface CaloriesDisplayProps {
    calories: number | null;
    proteins: number;
    fats: number;
    carbs: number;
}

export const CaloriesDisplay: React.FC<CaloriesDisplayProps> = ({
    calories,
    proteins,
    fats,
    carbs
}) => {
    return (
        <div className="text-center">
            <h4 className="text-[#22241E] font-bold mb-3">Расчетная норма КБЖУ:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-[#22241E]">Калории: {calories || '—'} ккал</span>
                <span className="text-[#22241E]">Белки: {proteins || '—'} г</span>
                <span className="text-[#22241E]">Жиры: {fats || '—'} г</span>
                <span className="text-[#22241E]">Углеводы: {carbs || '—'} г</span>
            </div>
        </div>
    );
};