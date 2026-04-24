import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { AddProductModal } from '../components/AddProductModal';

interface Product {
  product_id: string;
  name: string;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

interface MealEntry {
  entry_id: string;
  meal_type: string;
  meal_time?: string;
  quantity_g: number;
  product: {
    product_id?: string;
    name: string;
    calories: number;
    proteins: number;
    fats: number;
    carbs: number;
  };
}

interface DailyStats {
  total_calories: number;
  total_proteins: number;
  total_fats: number;
  total_carbs: number;
}

interface Targets {
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
}

export const DiaryPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('Завтрак');

  const [dailyStats, setDailyStats] = useState<DailyStats>({
    total_calories: 0,
    total_proteins: 0,
    total_fats: 0,
    total_carbs: 0,
  });
  const [targets, setTargets] = useState<Targets>({
    calories: 2000,
    proteins: 120,
    fats: 60,
    carbs: 250,
  });

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // 🔥 Функция безопасного преобразования к числу
  const toNumber = (value: any, fallback: number = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? fallback : num;
  };

  const loadDiaryData = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3001/api/diary/meals?date=${dateStr}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();

        if (data?.success && Array.isArray(data.data)) {
          const backendMeals = data.data;
          const mappedMeals: MealEntry[] = [];

          for (const meal of backendMeals) {
            const entries = meal.entries || [];
            for (const entry of entries) {
              mappedMeals.push({
                entry_id: entry.entry_id || '',
                meal_type: meal.meal_name || 'Перекус',
                meal_time: meal.meal_time,
                quantity_g: toNumber(entry.quantity_g, 100),
                product: {
                  product_id: '',
                  // 🔥 Бэкенд теперь возвращает product_name из snapshot
                  name: entry.product_name || entry.name || 'Неизвестный продукт',
                  calories: toNumber(entry.calories, 0),
                  proteins: toNumber(entry.proteins, 0),
                  fats: toNumber(entry.fats, 0),
                  carbs: toNumber(entry.carbs, 0),
                },
              });
            }
          }

          setMeals(mappedMeals);

          // 🔥 Пересчитываем итоги
          const totals = mappedMeals.reduce(
            (acc, entry) => {
              acc.total_calories += toNumber(entry.product.calories, 0);
              acc.total_proteins += toNumber(entry.product.proteins, 0);
              acc.total_fats += toNumber(entry.product.fats, 0);
              acc.total_carbs += toNumber(entry.product.carbs, 0);
              return acc;
            },
            { total_calories: 0, total_proteins: 0, total_fats: 0, total_carbs: 0 },
          );

          setDailyStats(totals);
        }
      }

      // Загрузка норм из профиля
      const profileResponse = await fetch('http://localhost:3001/api/profile', {
        credentials: 'include',
      });
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData?.success && profileData?.data) {
          setTargets({
            calories: toNumber(profileData.data.daily_calorie_norm, 2000),
            proteins: toNumber(profileData.data.daily_protein_norm, 120),
            fats: toNumber(profileData.data.daily_fat_norm, 60),
            carbs: toNumber(profileData.data.daily_carb_norm, 250),
          });
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки дневника:', err);
      setError('Не удалось загрузить данные дневника');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDiaryData(formatDate(selectedDate));
  }, [selectedDate]);

  const handleAddMeal = (mealType: string) => {
    setSelectedMealType(mealType);
    setShowAddModal(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Удалить этот продукт?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/diary/meals/entry/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Обновляем данные после удаления
        loadDiaryData(formatDate(selectedDate));
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка при удалении');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Не удалось связаться с сервером');
    }
  };

  const handleModalSuccess = () => {
    setShowAddModal(false);
    loadDiaryData(formatDate(selectedDate));
  };

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

  const monthNames = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];

  const mealTypes = ['Завтрак', 'Обед', 'Ужин'];

  const formatTime = (timeStr: string | undefined) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  // Группировка записей по приёмам пищи
  const groupedMeals = meals.reduce(
    (acc, meal) => {
      if (!acc[meal.meal_type]) {
        acc[meal.meal_type] = [];
      }
      acc[meal.meal_type].push(meal);
      return acc;
    },
    {} as Record<string, MealEntry[]>,
  );

  // 🔥 Расчёт итогов для приёма пищи
  const calculateMealTotals = (entries: MealEntry[]) => {
    return entries.reduce(
      (totals, entry) => {
        totals.calories += toNumber(entry.product.calories, 0);
        totals.proteins += toNumber(entry.product.proteins, 0);
        totals.fats += toNumber(entry.product.fats, 0);
        totals.carbs += toNumber(entry.product.carbs, 0);
        return totals;
      },
      { calories: 0, proteins: 0, fats: 0, carbs: 0 },
    );
  };

  return (
    <div className="w-full min-h-screen bg-[#FFFFE6] font-['Jost'] py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Верхняя панель */}
        <nav className="flex justify-between items-center mb-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="BalanceBite Logo" className="w-[143px] h-[37px] object-contain" />
          </Link>
          <div className="flex gap-[20px]">
            <a href="/diary" className="text-[16px] font-bold text-[#58B079] transition-colors">
              Дневник питания
            </a>
            <a
              href="/analytics"
              className="text-[16px] text-[#22241E] hover:text-[#58B079] transition-colors"
            >
              Аналитика
            </a>
            <a
              href="/products"
              className="text-[16px] text-[#22241E] hover:text-[#58B079] transition-colors"
            >
              База продуктов
            </a>
          </div>
          <a href="/profile" className="w-[37px] h-[37px] bg-[#58B079] rounded-full"></a>
        </nav>

        <div className="flex gap-8">
          {/* Левая колонка - только календарь */}
          <div className="w-[490px]">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4 px-4 py-3 bg-[#D974E6] rounded-[15px]">
                <button
                  onClick={prevMonth}
                  className="text-white text-[20px] cursor-pointer hover:opacity-80"
                >
                  &lt;
                </button>
                <span className="text-white text-[16px] font-medium">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
                <button
                  onClick={nextMonth}
                  className="text-white text-[20px] cursor-pointer hover:opacity-80"
                >
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
                  const isSelected = formatDate(day) === formatDate(selectedDate);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(day)}
                      className={`w-full aspect-square rounded-[10px] text-center text-[16px] cursor-pointer transition-all
                        ${!isCurrentMonth ? 'text-[rgba(34,36,30,0.4)]' : 'text-[#22241E]'}
                        ${isSelected ? 'bg-[#D974E6] text-white font-bold' : 'hover:bg-[#F0F0F0]'}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Правая колонка - один белый блок */}
          <div className="flex-1">
            <button
              onClick={() => handleAddMeal('Завтрак')}
              className="w-full bg-[#8CDF75] rounded-[20px] py-3 mb-6 text-white text-[16px] font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span className="text-[20px]">+</span>
              Добавить приём пищи
            </button>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">Загрузка дневника...</div>
            ) : (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                {Object.keys(groupedMeals).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">Нет записей за этот день</div>
                ) : (
                  <div className="space-y-6">
                    {mealTypes.map((mealType) => {
                      const mealEntries = groupedMeals[mealType];
                      if (!mealEntries || mealEntries.length === 0) return null;
                      const totals = calculateMealTotals(mealEntries);
                      const mealTime = mealEntries[0]?.meal_time
                        ? formatTime(mealEntries[0].meal_time)
                        : '';

                      return (
                        <div
                          key={mealType}
                          className="border-b border-gray-200 last:border-0 pb-6 last:pb-0"
                        >
                          <div className="text-center mb-4">
                            <span className="text-[#58B079] text-[16px] font-bold uppercase">
                              {mealType.toUpperCase()} {mealTime && `(${mealTime})`}
                            </span>
                          </div>
                          <div className="space-y-4 mb-4">
                            {mealEntries.map((entry, idx) => {
                              const calories = Math.round(toNumber(entry.product.calories, 0));
                              const proteins = toNumber(entry.product.proteins, 0).toFixed(1);
                              const fats = toNumber(entry.product.fats, 0).toFixed(1);
                              const carbs = toNumber(entry.product.carbs, 0).toFixed(1);

                              return (
                                <div key={entry.entry_id || idx} className="group relative">
                                  <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                      {/* Кнопка удаления (появляется при наведении или видна всегда) */}
                                      <button
                                        onClick={() => handleDeleteEntry(entry.entry_id)}
                                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                                        title="Удалить"
                                      >
                                        <svg
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                        >
                                          <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                      </button>
                                      <span className="text-[15px] text-[#22241E] font-medium">
                                        {entry.product?.name || 'Неизвестный продукт'}
                                      </span>
                                    </div>
                                    <span className="text-[15px] text-[#22241E]">
                                      {entry.quantity_g}г | {calories} ккал
                                    </span>
                                  </div>
                                  <div className="text-[14px] text-gray-600 ml-8">
                                    {' '}
                                    {/* Сдвиг, чтобы было под названием */}
                                    Б: {proteins}г Ж: {fats}г У: {carbs}г
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[15px] font-bold text-[#22241E]">
                                ИТОГО ЗА {mealType.toUpperCase()}
                              </span>
                              <span className="text-[15px] font-bold text-[#22241E]">
                                {Math.round(toNumber(totals.calories, 0))} ккал
                              </span>
                            </div>
                            <div className="text-[14px] text-gray-600 text-center">
                              Белки: {toNumber(totals.proteins, 0).toFixed(1)}г | Жиры:{' '}
                              {toNumber(totals.fats, 0).toFixed(1)}г | Углеводы:{' '}
                              {toNumber(totals.carbs, 0).toFixed(1)}г
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddProductModal
          mealName={selectedMealType}
          date={formatDate(selectedDate)}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};
