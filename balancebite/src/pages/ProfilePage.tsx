import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfileAPI, ProfileMetrics } from '../features/FR-201';
import { GoalSelector, ActivityLevel, CaloriesDisplay, useCalorieAPI } from '../features/FR-204';
import logo from '../assets/logo.svg';

interface FormDataType {
    name: string;
    gender: 'male' | 'female';
    age: string;
    height_cm: string;
    weight_kg: string;
    goal: 'weight_loss' | 'maintenance' | 'weight_gain';
    activityLevel: string;
    email: string;
    phone: string;
    status: string;
}

interface ProductListType {
    favorite: string[];
    notFavorite: string[];
}

export const ProfilePage: React.FC = () => {
    const [formData, setFormData] = useState<FormDataType>({
        name: '',
        gender: 'male',
        age: '',
        height_cm: '',
        weight_kg: '',
        goal: 'maintenance',
        activityLevel: '1.2',
        email: '',
        phone: '',
        status: ''
    });

    const [metrics, setMetrics] = useState({
        bmi: null as number | null,
        bmiCategory: '',
        idealWeight: '',
        bmr: '',
        calories: null as number | null,
        proteins: 0,
        fats: 0,
        carbs: 0
    });

    const [products, setProducts] = useState<ProductListType>({
        favorite: ['Курица', 'Авокадо', 'Гречка', 'Яйца', 'Бананы', 'Творог'],
        notFavorite: ['Рыба', 'Брокколи', 'Печень']
    });

    const [isFavoriteOpen, setIsFavoriteOpen] = useState(false);
    const [isNotFavoriteOpen, setIsNotFavoriteOpen] = useState(false);
    const [newFavoriteProduct, setNewFavoriteProduct] = useState('');
    const [newNotFavoriteProduct, setNewNotFavoriteProduct] = useState('');
    
    const { loadProfile, saveProfile, loading, errors } = useProfileAPI();
    const { fetchCalories } = useCalorieAPI();
    const [showError, setShowError] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const loadMetricsFromAPI = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/profile/metrics', {
                credentials: 'include'
            });

            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setMetrics({
                    bmi: data.data.bmi,
                    bmiCategory: data.data.bmiCategory,
                    idealWeight: data.data.healthyWeightRange
                        ? `${data.data.healthyWeightRange.min}-${data.data.healthyWeightRange.max} кг`
                        : '—',
                    bmr: data.data.bmr || '—',
                    calories: data.data.daily_calorie_norm,
                    proteins: Math.round((data.data.daily_calorie_norm || 2000) * 0.3 / 4),
                    fats: Math.round((data.data.daily_calorie_norm || 2000) * 0.25 / 9),
                    carbs: Math.round((data.data.daily_calorie_norm || 2000) * 0.45 / 4)
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки метрик:', error);
        }
    };

    const updateCalories = async () => {
        if (!formData.height_cm || !formData.weight_kg || !formData.age) return;
        const data = await fetchCalories(formData.activityLevel);
        if (data === null) {
            return;
        }
        if (data) {
            setMetrics(prev => ({
                ...prev,
                calories: data.dailyCalorieNorm,
                bmr: data.bmr.toString()
            }));
        }
    };

    useEffect(() => {
        const loadData = async () => {
            const data = await loadProfile();
            if (data === null) {
                return;
            }
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    gender: data.gender === 'female' ? 'female' : 'male',
                    age: data.age?.toString() || '',
                    height_cm: data.height_cm?.toString() || '',
                    weight_kg: data.weight_kg?.toString() || '',
                }));
                await loadMetricsFromAPI();
            }
        };
        loadData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowError(false);
        setSaveSuccess(false);

        let result;

        try {
            result = await saveProfile({
                gender: formData.gender,
                age: Number(formData.age),
                height_cm: Number(formData.height_cm),
                weight_kg: Number(formData.weight_kg),
                goal: formData.goal === 'weight_loss' ? 'Снижение веса' :
                    formData.goal === 'weight_gain' ? 'Набор массы' : 'Поддержание веса'
            });

            if (result.success) {
                setSaveSuccess(true);
                await loadMetricsFromAPI();
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                setShowError(true);
                setTimeout(() => setShowError(false), 3000);
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'height_cm' || name === 'weight_kg' || name === 'age') {
            setTimeout(() => updateCalories(), 500);
        }
    };

    const handleGenderChange = (gender: 'male' | 'female') => {
        setFormData(prev => ({ ...prev, gender }));
    };

    const handleGoalChange = (goal: 'weight_loss' | 'maintenance' | 'weight_gain') => {
        setFormData(prev => ({ ...prev, goal }));
        setTimeout(() => updateCalories(), 100);
    };

    const handleActivityLevelChange = (level: string) => {
        setFormData(prev => ({ ...prev, activityLevel: level }));
        setTimeout(() => updateCalories(), 100);
    };

    const handleNameChange = (name: string) => {
        setFormData(prev => ({ ...prev, name }));
    };

    const addFavoriteProduct = () => {
        if (newFavoriteProduct.trim()) {
            setProducts(prev => ({
                ...prev,
                favorite: [...prev.favorite, newFavoriteProduct.trim()]
            }));
            setNewFavoriteProduct('');
        }
    };

    const addNotFavoriteProduct = () => {
        if (newNotFavoriteProduct.trim()) {
            setProducts(prev => ({
                ...prev,
                notFavorite: [...prev.notFavorite, newNotFavoriteProduct.trim()]
            }));
            setNewNotFavoriteProduct('');
        }
    };

    const removeFavoriteProduct = (productToRemove: string) => {
        setProducts(prev => ({
            ...prev,
            favorite: prev.favorite.filter(p => p !== productToRemove)
        }));
    };

    const removeNotFavoriteProduct = (productToRemove: string) => {
        setProducts(prev => ({
            ...prev,
            notFavorite: prev.notFavorite.filter(p => p !== productToRemove)
        }));
    };

    return (
        <section className="w-full bg-[#FFFFE6] min-h-screen py-8 lg:py-12">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                {/* Верхняя панель навигации с логотипом */}
                <nav className="flex justify-between items-center mb-8">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="BalanceBite Logo" className="w-60 h-11 object-contain" />
                    </Link>
                    <div className="flex gap-8">
                        <a href="/diary" className="text-[#22241E] hover:text-[#58B079] transition-colors">
                            Дневник питания
                        </a>
                        <a href="/analytics" className="text-[#22241E] hover:text-[#58B079] transition-colors">
                            Аналитика
                        </a>
                        <a href="/products" className="text-[#22241E] hover:text-[#58B079] transition-colors">
                            База продуктов
                        </a>
                    </div>
                    <div className="w-10 h-10 bg-[#58B079] rounded-full"></div>
                </nav>
                {saveSuccess && (
                    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fadeOut">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-xl">
                            Профиль успешно сохранен!
                        </div>
                    </div>
                )}
                {showError && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fadeOut">
                        <div className="bg-red-500/75 backdrop-blur-sm border border-red-800 rounded-xl px-6 py-2">
                            <span className="text-white">Ошибка сохранения профиля</span>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    {/* Верхний ряд: аватарка + имя + краткая информация */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="flex items-center gap-6">
                            <div className="w-[150px] h-[150px] bg-[#58B079] rounded-full flex items-center justify-center text-white text-4xl flex-shrink-0">
                                👤
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full px-4 py-2 bg-[#F0F0F0] rounded-2xl text-2xl font-bold text-[#58B079] focus:outline-none focus:ring-2 focus:ring-[#58B079]"
                                    placeholder="Ваше имя"
                                />
                                <button type="button" className="mt-2 text-[#58B079] font-bold hover:underline">
                                    Изменить фото
                                </button>
                            </div>
                        </div>

                        {/* Краткая информация */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4">Краткая информация</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22241E] w-20">E-mail:</span>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="flex-1 px-3 py-1 bg-[#F0F0F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                        placeholder="example@mail.com"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22241E] w-20">Телефон:</span>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="flex-1 px-3 py-1 bg-[#F0F0F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                        placeholder="+7 (999) 123-45-67"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22241E] w-20">Статус:</span>
                                    <input
                                        type="text"
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                        className="flex-1 px-3 py-1 bg-[#F0F0F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                        placeholder="Активен"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Блоки: мои показатели + цель питания */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <ProfileMetrics
                            metrics={metrics}
                            formData={formData}
                            errors={errors}
                            onInputChange={handleInputChange}
                            onGenderChange={handleGenderChange}
                        />

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4 text-center">Цель питания</h3>

                            <GoalSelector
                                selectedGoal={formData.goal}
                                onGoalChange={handleGoalChange}
                            />

                            <ActivityLevel
                                selectedLevel={formData.activityLevel}
                                onLevelChange={handleActivityLevelChange}
                            />

                            <CaloriesDisplay
                                calories={metrics.calories}
                                proteins={metrics.proteins}
                                fats={metrics.fats}
                                carbs={metrics.carbs}
                            />
                        </div>
                    </div>

                    {/* Аллергии и предпочтения */}
                    <div className="mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4 text-center">
                                Аллергии и предпочтения
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Аллергены */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="lactose" className="w-4 h-4 accent-[#58B079]" />
                                        <label htmlFor="lactose" className="text-[#22241E]">Лактоза</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="nuts" className="w-4 h-4 accent-[#58B079]" />
                                        <label htmlFor="nuts" className="text-[#22241E]">Орехи</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="fish" className="w-4 h-4 accent-[#D9D9D9]" />
                                        <label htmlFor="fish" className="text-[#22241E]">Рыба</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="honey" className="w-4 h-4 accent-[#D9D9D9]" />
                                        <label htmlFor="honey" className="text-[#22241E]">Мёд</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="gluten" className="w-4 h-4 accent-[#D9D9D9]" />
                                        <label htmlFor="gluten" className="text-[#22241E]">Глютен</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="eggs" className="w-4 h-4 accent-[#D9D9D9]" />
                                        <label htmlFor="eggs" className="text-[#22241E]">Яйца</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="soy" className="w-4 h-4 accent-[#D9D9D9]" />
                                        <label htmlFor="soy" className="text-[#22241E]">Соя</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="other" className="w-4 h-4 accent-[#D9D9D9]" />
                                        <label htmlFor="other" className="text-[#22241E]">Другое</label>
                                    </div>
                                </div>

                                {/* Любимые и НЕлюбимые продукты */}
                                <div className="space-y-4">
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setIsFavoriteOpen(!isFavoriteOpen)}
                                            className="flex items-center gap-2 text-[#58B079] font-bold hover:opacity-80"
                                        >
                                            <span className="text-xl">{isFavoriteOpen ? '▼' : '▶'}</span>
                                            <span>Любимые продукты:</span>
                                            <span className="text-green-500 text-lg font-bold">+</span>
                                        </button>

                                        {isFavoriteOpen && (
                                            <div className="mt-2 ml-6 space-y-2">
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {products.favorite.map((product, idx) => (
                                                        <div key={idx} className="flex items-center gap-1 bg-[#F0F0F0] rounded-full px-3 py-1">
                                                            <span className="text-[#22241E] text-sm">{product}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFavoriteProduct(product)}
                                                                className="text-red-500 hover:text-red-700 ml-1"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newFavoriteProduct}
                                                        onChange={(e) => setNewFavoriteProduct(e.target.value)}
                                                        className="px-3 py-1 bg-[#F0F0F0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                                        placeholder="Добавить продукт..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={addFavoriteProduct}
                                                        className="px-3 py-1 bg-[#58B079] text-white rounded-xl text-sm hover:opacity-80"
                                                    >
                                                        Добавить
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => setIsNotFavoriteOpen(!isNotFavoriteOpen)}
                                            className="flex items-center gap-2 text-[#58B079] font-bold hover:opacity-80"
                                        >
                                            <span className="text-xl">{isNotFavoriteOpen ? '▼' : '▶'}</span>
                                            <span>НЕлюбимые продукты:</span>
                                            <span className="text-green-500 text-lg font-bold">+</span>
                                        </button>

                                        {isNotFavoriteOpen && (
                                            <div className="mt-2 ml-6 space-y-2">
                                                <div className="flex flex-wrap gap-2 mb-2">
                                                    {products.notFavorite.map((product, idx) => (
                                                        <div key={idx} className="flex items-center gap-1 bg-[#F0F0F0] rounded-full px-3 py-1">
                                                            <span className="text-[#22241E] text-sm">{product}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeNotFavoriteProduct(product)}
                                                                className="text-red-500 hover:text-red-700 ml-1"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newNotFavoriteProduct}
                                                        onChange={(e) => setNewNotFavoriteProduct(e.target.value)}
                                                        className="px-3 py-1 bg-[#F0F0F0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                                        placeholder="Добавить продукт..."
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={addNotFavoriteProduct}
                                                        className="px-3 py-1 bg-[#58B079] text-white rounded-xl text-sm hover:opacity-80"
                                                    >
                                                        Добавить
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Кнопка сохранения */}
                    <div className="flex justify-center">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-[#8CDF75] text-white font-bold rounded-2xl
                                     transition-all duration-300 transform hover:-translate-y-1 hover:scale-105
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </div>
                </form>

                {showError && (
                    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-fadeOut">
                        <div className="bg-red-500/75 backdrop-blur-sm border border-red-800 rounded-xl px-6 py-2">
                            <span className="text-white">Ошибка сохранения профиля</span>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; visibility: hidden; }
                }
                .animate-fadeOut {
                    animation: fadeOut 3s forwards;
                }
            `}</style>
        </section>
    );
};

export default ProfilePage;