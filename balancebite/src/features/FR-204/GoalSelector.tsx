import React from 'react';

type GoalType = 'weight_loss' | 'maintenance' | 'weight_gain';

interface GoalSelectorProps {
    selectedGoal: GoalType;
    onGoalChange: (goal: GoalType) => void;
}

export const GoalSelector: React.FC<GoalSelectorProps> = ({ selectedGoal, onGoalChange }) => {
    const goals = [
        { id: 'weight_loss', label: 'Снижение веса' },
        { id: 'maintenance', label: 'Поддержание веса' },
        { id: 'weight_gain', label: 'Набор массы' }
    ] as const;

    return (
        <div className="flex justify-center gap-4 mb-6">
            {goals.map((goal) => (
                <button
                    key={goal.id}
                    type="button"
                    onClick={() => onGoalChange(goal.id)}
                    className={`relative px-4 py-2 transition-all ${selectedGoal === goal.id
                            ? 'text-[#22241E] before:content-["●"] before:text-[#D974E6] before:absolute before:-left-4'
                            : 'text-[#22241E]'
                        }`}
                >
                    {goal.label}
                </button>
            ))}
        </div>
    );
};