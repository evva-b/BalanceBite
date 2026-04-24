// AnalyticsPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Bar,
    ComposedChart
} from 'recharts';
import logo from '../assets/logo.svg';

interface WeightMeasurement {
    measurement_date: string;
    weight_kg: number;
    note: string | null;
}

interface WeightStats {
    totalMeasurements: number;
    startWeight: number | null;
    endWeight: number | null;
    weightChange: number | null;
    averageWeight: number | null;
    minWeight: number | null;
    maxWeight: number | null;
    progressToGoal: number | null;
}

interface NutritionDailyData {
    date: string;
    total_proteins: number;
    total_fats: number;
    total_carbs: number;
    total_calories: number;
}

interface NutritionStats {
    totalDays: number;
    averageProteins: number;
    averageFats: number;
    averageCarbs: number;
    averageCalories: number;
    totalProteins: number;
    totalFats: number;
    totalCarbs: number;
    totalCalories: number;
    maxProteins: number;
    maxFats: number;
    maxCarbs: number;
    maxCalories: number;
    minProteins: number;
    minFats: number;
    minCarbs: number;
    minCalories: number;
}

interface Targets {
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
}

export const AnalyticsPage: React.FC = () => {
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [isPeriodSelected, setIsPeriodSelected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [measurements, setMeasurements] = useState<WeightMeasurement[]>([]);

    const [weightStats, setWeightStats] = useState<WeightStats | null>(null);
    const [nutritionDailyData, setNutritionDailyData] = useState<NutritionDailyData[]>([]);
    const [nutritionStats, setNutritionStats] = useState<NutritionStats | null>(null);
    const [targets, setTargets] = useState<Targets | null>(null);
    const [currentWeight, setCurrentWeight] = useState<number | null>(null);
    const [goal, setGoal] = useState<string | null>(null);

    // Состояние календаря
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
    const [isSelectingStart, setIsSelectingStart] = useState(true);

    const formatDate = (date: Date): string => {
        return date.toISOString().split('T')[0];
    };

    const formatDisplayDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatChartDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    };

    // Загрузка истории питания из meal_entries
    const loadNutritionHistory = async (start: string, end: string) => {
        try {
            const response = await fetch(
                `http://localhost:3001/api/analytics/nutrition-history?startDate=${start}&endDate=${end}`,
                { credentials: 'include' }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNutritionDailyData(data.data.dailyData);
                    setNutritionStats(data.data.stats);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки истории питания:', error);
        }
    };

    // Загрузка аналитики
    const loadAnalytics = async () => {
        if (!selectedStartDate || !selectedEndDate) {
            setError('Выберите дату начала и окончания периода');
            return;
        }

        const start = formatDate(selectedStartDate);
        const end = formatDate(selectedEndDate);

        if (new Date(start) > new Date(end)) {
            setError('Дата начала не может быть позже даты окончания');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Загружаем историю веса
            const weightResponse = await fetch(
                `http://localhost:3001/api/analytics/weight-history?startDate=${start}&endDate=${end}`,
                { credentials: 'include' }
            );

            if (!weightResponse.ok) {
                throw new Error('Ошибка загрузки данных о весе');
            }

            const weightData = await weightResponse.json();
            if (weightData.success) {
                setMeasurements(weightData.data.measurements || []);
                setWeightStats(weightData.data.stats);
                if (weightData.data.goal) {
                    const currentWeightNum = typeof weightData.data.goal.current_weight === 'string'
                        ? parseFloat(weightData.data.goal.current_weight)
                        : weightData.data.goal.current_weight;
                    setCurrentWeight(currentWeightNum || null);
                    setGoal(weightData.data.goal.goal);
                }
                setStartDate(start);
                setEndDate(end);
                setIsPeriodSelected(true);
            }

            // Загружаем историю питания из meal_entries
            await loadNutritionHistory(start, end);

            // Загружаем нормы из профиля
            const profileResponse = await fetch('http://localhost:3001/api/profile', {
                credentials: 'include'
            });

            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                if (profileData.success && profileData.data) {
                    setTargets({
                        calories: profileData.data.daily_calorie_norm || 2000,
                        proteins: 120,
                        fats: 60,
                        carbs: 250
                    });
                }
            }

        } catch (err) {
            console.error('Ошибка загрузки аналитики:', err);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить данные анализа');
            setIsPeriodSelected(false);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyPeriod = () => {
        loadAnalytics();
    };

    // Генерация календаря
    const getDaysInMonth = (date: Date): Date[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const startDateObj = new Date(year, month, 1 - startOffset);
        const days: Date[] = [];

        for (let i = 0; i < 42; i++) {
            const day = new Date(startDateObj);
            day.setDate(startDateObj.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const daysInMonth = getDaysInMonth(currentMonth);
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const isDateInRange = (date: Date): boolean => {
        if (!selectedStartDate || !selectedEndDate) return false;
        return date >= selectedStartDate && date <= selectedEndDate;
    };

    const handleDateClick = (date: Date) => {
        setError(null);
        if (isSelectingStart) {
            setSelectedStartDate(date);
            setSelectedEndDate(null);
            setIsSelectingStart(false);
        } else {
            if (date >= selectedStartDate!) {
                setSelectedEndDate(date);
                setIsSelectingStart(true);
            } else {
                setSelectedStartDate(date);
                setSelectedEndDate(null);
            }
        }
    };

    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const getTargetWeight = (): number => {
        if (!currentWeight || !goal) return 0;
        const weightNum = typeof currentWeight === 'number' ? currentWeight : parseFloat(String(currentWeight));
        if (isNaN(weightNum)) return 0;
        if (goal === 'Снижение веса') return weightNum - 5;
        if (goal === 'Набор массы') return weightNum + 5;
        return weightNum;
    };

    const targetWeight = getTargetWeight();
    const startWeight = weightStats?.startWeight;
    const endWeight = weightStats?.endWeight;
    const progressPercent = weightStats?.progressToGoal;
    const weightChange = weightStats?.weightChange;

    const getProgressDisplay = (): string => {
        if (progressPercent === null) return '0%';
        return `${Math.abs(progressPercent)}%`;
    };

    const getPeriodDisplay = () => {
        if (startDate && endDate) {
            const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return `${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)} (${daysDiff} дней)`;
        }
        return '';
    };

    // Данные из meal_entries (реальные потребленные нутриенты)
    const proteinValue = nutritionStats?.averageProteins ?? 0;
    const fatValue = nutritionStats?.averageFats ?? 0;
    const carbValue = nutritionStats?.averageCarbs ?? 0;
    const proteinTarget = targets?.proteins ?? 120;
    const fatTarget = targets?.fats ?? 60;
    const carbTarget = targets?.carbs ?? 250;

    // Подготовка данных для графика веса
    const chartData = measurements.map(m => ({
        date: formatChartDate(m.measurement_date),
        fullDate: m.measurement_date,
        weight: m.weight_kg
    }));

    // Подготовка данных для графика нутриентов (используем nutritionDailyData)
    const nutritionChartData = nutritionDailyData.map(day => ({
        date: formatChartDate(day.date),
        fullDate: day.date,
        proteins: day.total_proteins,
        fats: day.total_fats,
        carbs: day.total_carbs,
        calories: day.total_calories
    }));

    const minWeight = chartData.length > 0 ? Math.min(...chartData.map(d => d.weight)) - 2 : 50;
    const maxWeight = chartData.length > 0 ? Math.max(...chartData.map(d => d.weight)) + 2 : 100;

    const showTargetWeight = targetWeight > 0 && !isNaN(targetWeight);
    const hasNutritionData = nutritionDailyData.length > 0;

    return (
        <div className="w-full min-h-screen bg-[#FFFFE6] font-['Jost'] py-8">
            <div className="max-w-[1200px] mx-auto px-4">
                {/* Верхняя панель */}
                <nav className="flex justify-between items-center mb-8">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="BalanceBite Logo" className="w-[143px] h-[37px] object-contain" />
                    </Link>
                    <div className="flex gap-[20px]">
                        <a href="/diary" className="text-[16px] text-[#22241E] hover:text-[#58B079] transition-colors">
                            Дневник питания
                        </a>
                        <a href="/analytics" className="text-[16px] font-bold text-[#58B079] transition-colors">
                            Аналитика
                        </a>
                        <a href="/products" className="text-[16px] text-[#22241E] hover:text-[#58B079] transition-colors">
                            База продуктов
                        </a>
                    </div>
                    <div className="w-[37px] h-[37px] bg-[#58B079] rounded-full"></div>
                </nav>

                {/* Фиксированный контейнер с flex, календарь не меняет размер */}
                <div className="flex gap-8 items-start">
                    {/* Левая колонка - календарь (ФИКСИРОВАННЫЙ РАЗМЕР) */}
                    <div className="w-[490px] flex-shrink-0">
                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-4 px-4 py-3 bg-[#D974E6] rounded-[15px]">
                                <button onClick={prevMonth} className="text-white text-[20px] cursor-pointer hover:opacity-80">
                                    &lt;
                                </button>
                                <span className="text-white text-[16px] font-medium">
                                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </span>
                                <button onClick={nextMonth} className="text-white text-[20px] cursor-pointer hover:opacity-80">
                                    &gt;
                                </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                                {weekDays.map((day, idx) => (
                                    <div key={idx} className="text-[16px] text-[#22241E] py-1">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {daysInMonth.map((day, idx) => {
                                    const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                    const isInRange = isDateInRange(day);
                                    const isStartDate = selectedStartDate && formatDate(day) === formatDate(selectedStartDate);
                                    const isEndDate = selectedEndDate && formatDate(day) === formatDate(selectedEndDate);

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleDateClick(day)}
                                            className={`
                                                w-full aspect-square rounded-[10px] text-center text-[16px] cursor-pointer transition-all
                                                ${!isCurrentMonth ? 'text-[rgba(34,36,30,0.4)]' : 'text-[#22241E]'}
                                                ${isInRange && !isStartDate && !isEndDate ? 'bg-[#D974E6] bg-opacity-30' : ''}
                                                ${isStartDate || isEndDate ? 'bg-[#D974E6] text-white' : ''}
                                                ${!isStartDate && !isEndDate && !isInRange ? 'hover:bg-[#F0F0F0]' : ''}
                                            `}
                                        >
                                            {day.getDate()}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-4 text-center text-[14px] text-[#22241E]">
                                {isSelectingStart ? 'Выберите дату НАЧАЛА периода' : 'Выберите дату ОКОНЧАНИЯ периода'}
                            </div>
                        </div>
                    </div>

                    {/* Правая колонка - аналитика (занимает оставшееся место) */}
                    <div className="flex-1 min-w-0">
                        <div className="text-[16px] text-[#22241E] mb-4">
                            Выберите период для анализа (дату начала и дату конца) и нажмите “Применить”
                        </div>

                        <button
                            onClick={handleApplyPeriod}
                            disabled={loading}
                            className="w-[200px] py-2 bg-[#8CDF75] rounded-[20px] text-white text-[16px] hover:opacity-90 transition-opacity disabled:opacity-50 mb-6 block mx-auto"
                        >
                            {loading ? 'Загрузка...' : 'Применить'}
                        </button>

                        {/* Отображение выбранного периода */}
                        {isPeriodSelected && startDate && endDate && (
                            <div className="text-[16px] text-[rgba(34,36,30,0.8)] mb-4 text-center">
                                Период анализа: {getPeriodDisplay()}
                            </div>
                        )}

                        {/* Результаты анализа */}
                        {isPeriodSelected && !error && (
                            <div className="space-y-6">
                                {/* Динамика веса - ГРАФИК */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm">
                                    <h3 className="text-center text-[16px] text-[#58B079] font-bold mb-4">
                                        Динамика веса за выбранный период
                                    </h3>

                                    {showTargetWeight && (
                                        <div className="text-center text-[14px] text-[#58B079] mb-3">
                                            Целевой вес: {targetWeight.toFixed(1)} кг
                                            ({goal === 'Снижение веса' ? 'снижение' : goal === 'Набор массы' ? 'набор' : 'поддержание'})
                                        </div>
                                    )}

                                    {chartData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 12, fill: '#666' }}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    domain={[minWeight, maxWeight]}
                                                    tick={{ fontSize: 12, fill: '#666' }}
                                                    label={{ value: 'Вес (кг)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#666' } }}
                                                />
                                                <Tooltip
                                                    formatter={(value) => [`${value} кг`, 'Вес']}
                                                    labelFormatter={(label) => `Дата: ${label}`}
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}
                                                />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="weight"
                                                    stroke="#D974E6"
                                                    strokeWidth={2}
                                                    dot={{ fill: '#D974E6', r: 4 }}
                                                    activeDot={{ r: 6 }}
                                                    name="Вес (кг)"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-center text-[16px] text-[rgba(34,36,30,0.6)] py-8">
                                            Нет данных о весе за выбранный период
                                        </div>
                                    )}

                                    {/* Статистика веса под графиком */}
                                    {weightStats && weightStats.totalMeasurements > 0 && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-[14px]">
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                    <span className="text-gray-500 block text-xs">Начальный вес</span>
                                                    <span className="font-bold text-[#58B079]">
                                                        {startWeight !== null && !isNaN(startWeight) ? startWeight.toFixed(1) : '—'} кг
                                                    </span>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                    <span className="text-gray-500 block text-xs">Конечный вес</span>
                                                    <span className="font-bold text-[#58B079]">
                                                        {endWeight !== null && !isNaN(endWeight) ? endWeight.toFixed(1) : '—'} кг
                                                    </span>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                    <span className="text-gray-500 block text-xs">Изменение</span>
                                                    <span className={`font-bold ${weightChange && weightChange < 0 ? 'text-green-500' : weightChange && weightChange > 0 ? 'text-red-500' : 'text-[#58B079]'}`}>
                                                        {weightChange !== null && !isNaN(weightChange) && weightChange > 0 ? '+' : ''}{weightChange?.toFixed(1) || '0'} кг
                                                    </span>
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-2">
                                                    <span className="text-gray-500 block text-xs">Прогресс к цели</span>
                                                    <span className="font-bold text-[#58B079]">{getProgressDisplay()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* График динамики нутриентов за период */}
                                {hasNutritionData && (
                                    <div className="bg-white rounded-2xl p-4 shadow-sm">
                                        <h3 className="text-center text-[16px] text-[#58B079] font-bold mb-4">
                                            Динамика потребления нутриентов
                                        </h3>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <ComposedChart data={nutritionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} />
                                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#666' }} label={{ value: 'г', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#666' }} label={{ value: 'ккал', angle: 90, position: 'insideRight', fontSize: 11 }} />
                                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }} />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey="proteins" fill="#FF7272" name="Белки (г)" />
                                                <Bar yAxisId="left" dataKey="fats" fill="#FFF461" name="Жиры (г)" />
                                                <Bar yAxisId="left" dataKey="carbs" fill="#58B079" name="Углеводы (г)" />
                                                <Line yAxisId="right" type="monotone" dataKey="calories" stroke="#D974E6" strokeWidth={2} name="Калории (ккал)" dot={{ fill: '#D974E6', r: 3 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Баланс макронутриентов - данные из meal_entries */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm">
                                    <h3 className="text-center text-[16px] text-[#58B079] font-bold mb-4">
                                        Баланс макронутриентов (среднее за период)
                                    </h3>

                                    {hasNutritionData ? (
                                        <div className="text-center text-[12px] text-gray-400 mb-3">
                                            На основе {nutritionStats?.totalDays || 0} дней с записями о питании
                                        </div>
                                    ) : (
                                        <div className="text-center text-[12px] text-orange-500 mb-3">
                                            Нет данных о питании за выбранный период. Добавьте приемы пищи в Дневник питания.
                                        </div>
                                    )}

                                    {/* Белки */}
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[14px] text-black">Белки:</span>
                                            <span className="text-[14px] text-black">
                                                {Math.round(proteinValue)}г / {proteinTarget}г
                                            </span>
                                        </div>
                                        <div className="w-full h-[20px] bg-[#F0F0F0] rounded-[15px] overflow-hidden">
                                            <div
                                                className="h-full bg-[#FF7272] rounded-[15px] transition-all duration-300"
                                                style={{ width: `${Math.min(100, (proteinValue / proteinTarget) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Жиры */}
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[14px] text-black">Жиры:</span>
                                            <span className="text-[14px] text-black">
                                                {Math.round(fatValue)}г / {fatTarget}г
                                            </span>
                                        </div>
                                        <div className="w-full h-[20px] bg-[#F0F0F0] rounded-[15px] overflow-hidden">
                                            <div
                                                className="h-full bg-[#FFF461] rounded-[15px] transition-all duration-300"
                                                style={{ width: `${Math.min(100, (fatValue / fatTarget) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Углеводы */}
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[14px] text-black">Углеводы:</span>
                                            <span className="text-[14px] text-black">
                                                {Math.round(carbValue)}г / {carbTarget}г
                                            </span>
                                        </div>
                                        <div className="w-full h-[20px] bg-[#F0F0F0] rounded-[15px] overflow-hidden">
                                            <div
                                                className="h-full bg-[#58B079] rounded-[15px] transition-all duration-300"
                                                style={{ width: `${Math.min(100, (carbValue / carbTarget) * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Детальная статистика */}
                                    {nutritionStats && nutritionStats.totalDays > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-100 text-[12px] text-gray-500 text-center">
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>Всего белков: {nutritionStats.totalProteins} г</div>
                                                <div>Всего жиров: {nutritionStats.totalFats} г</div>
                                                <div>Всего углеводов: {nutritionStats.totalCarbs} г</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Состояние ошибки/отсутствия данных */}
                        {(!isPeriodSelected || error) && !loading && (
                            <div className="text-center py-8">
                                <div className="w-[120px] h-[120px] mx-auto bg-[#D9D9D9] rounded-full flex items-center justify-center text-5xl mb-4">
                                    {error ? '⚠️' : '📅'}
                                </div>
                                {error && (
                                    <div className="bg-red-500/75 border border-red-800 rounded-[10px] px-4 py-2 mb-2 inline-block">
                                        <span className="text-[#22241E] text-[16px]">Ошибка проведения анализа</span>
                                    </div>
                                )}
                                <div className="text-[16px] text-[rgba(34,36,30,0.8)]">
                                    {error ? 'Попробуйте выбрать другой период' : 'Выберите период для анализа'}
                                </div>
                            </div>
                        )}

                        {/* Состояние загрузки */}
                        {loading && (
                            <div className="text-center py-8">
                                <div className="text-[16px] text-[#58B079]">Загрузка данных...</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;