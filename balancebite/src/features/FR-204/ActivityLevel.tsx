import React from 'react';

interface ActivityLevelProps {
    selectedLevel: string;
    onLevelChange: (level: string) => void;
}

export const ActivityLevel: React.FC<ActivityLevelProps> = ({ selectedLevel, onLevelChange }) => {
    const levels = [
        { value: '1.2', label: 'Минимальная' },
        { value: '1.55', label: 'Умеренная' },
        { value: '1.9', label: 'Высокая' }
    ];

    return (
        <div className="mb-6">
            <span className="text-[#22241E] block mb-3">Уровень активности:</span>
            <div className="flex justify-center gap-4">
                {levels.map((level) => (
                    <button
                        key={level.value}
                        type="button"
                        onClick={() => onLevelChange(level.value)}
                        className={`px-4 py-1 rounded-full transition-all ${selectedLevel === level.value
                                ? 'bg-[#D974E6] text-white'
                                : 'bg-[#F0F0F0] text-[#22241E]'
                            }`}
                    >
                        {level.label}
                    </button>
                ))}
            </div>
        </div>
    );
};