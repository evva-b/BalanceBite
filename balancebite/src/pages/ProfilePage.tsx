import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfileAPI, ProfileMetrics } from '../features/FR-201';
import { GoalSelector, ActivityLevel, CaloriesDisplay, useCalorieAPI } from '../features/FR-204';
import logo from '../assets/logo.svg';

interface FormDataType {
    name: string;
    gender: 'M' | 'Ж';
    age: string;
    height_cm: string;
    weight_kg: string;
    goal: 'weight_loss' | 'maintenance' | 'weight_gain';
    activityLevel: 'minimal' | 'moderate' | 'high';
    email: string;
    phone: string;
    status: string;
}

interface FavoriteProduct {
    id: string;
    name: string;
    calories_kcal: number;
    proteins_g: number;
    fats_g: number;
    carbs_g: number;
}

interface ProductListType {
    favorite: FavoriteProduct[];
    notFavorite: string[];
}

export const ProfilePage: React.FC = () => {
    const [formData, setFormData] = useState<FormDataType>({
        name: '',
        gender: 'M',
        age: '',
        height_cm: '',
        weight_kg: '',
        goal: 'maintenance',
        activityLevel: 'moderate',
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
        favorite: [
            { id: '1', name: 'Курица', calories_kcal: 165, proteins_g: 31, fats_g: 3.6, carbs_g: 0 },
            { id: '2', name: 'Авокадо', calories_kcal: 160, proteins_g: 2, fats_g: 15, carbs_g: 9 },
            { id: '3', name: 'Гречка', calories_kcal: 343, proteins_g: 13, fats_g: 3.4, carbs_g: 72 },
            { id: '4', name: 'Яйца', calories_kcal: 155, proteins_g: 13, fats_g: 11, carbs_g: 1.1 },
            { id: '5', name: 'Бананы', calories_kcal: 89, proteins_g: 1.1, fats_g: 0.3, carbs_g: 23 },
            { id: '6', name: 'Творог', calories_kcal: 98, proteins_g: 11, fats_g: 2.5, carbs_g: 3.3 }
        ],
        notFavorite: ['Рыба', 'Брокколи', 'Печень', 'Морепродукты', 'Тофу']
    });

    const [isFavoriteOpen, setIsFavoriteOpen] = useState(true);
    const [isNotFavoriteOpen, setIsNotFavoriteOpen] = useState(true);
    const [newFavoriteProduct, setNewFavoriteProduct] = useState('');
    const [newNotFavoriteProduct, setNewNotFavoriteProduct] = useState('');

    const { loadProfile, saveProfile, loading, errors } = useProfileAPI();
    const { fetchCalories } = useCalorieAPI();

    const [showError, setShowError] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const activityLevelToValue = {
        'minimal': '1.2',
        'moderate': '1.55',
        'high': '1.9'
    };

    const valueToActivityLevel = {
        '1.2': 'minimal',
        '1.55': 'moderate',
        '1.9': 'high'
    };

    const goalToAPI = {
        'weight_loss': 'Снижение веса',
        'maintenance': 'Поддержание веса',
        'weight_gain': 'Набор массы'
    };

    const apiToGoal = {
        'Снижение веса': 'weight_loss',
        'Поддержание веса': 'maintenance',
        'Набор массы': 'weight_gain'
    };

    const loadProfileData = async () => {
        setIsLoadingData(true);
        const data = await loadProfile();
        if (data) {
            setFormData({
                name: data.email?.split('@')[0] || '',
                gender: data.gender === 'M' ? 'M' : 'Ж',
                age: data.age?.toString() || '',
                height_cm: data.height_cm?.toString() || '',
                weight_kg: data.weight_kg?.toString() || '',
                goal: apiToGoal[data.goal] || 'maintenance',
                activityLevel: data.activity_level || 'moderate',
                email: data.email || '',
                phone: data.phone || '',
                status: data.status || ''
            });

            if (data.favoriteProducts && data.favoriteProducts.length > 0) {
                setProducts(prev => ({
                    ...prev,
                    favorite: data.favoriteProducts
                }));
            }
            if (data.dislikedProducts && data.dislikedProducts.length > 0) {
                setProducts(prev => ({
                    ...prev,
                    notFavorite: data.dislikedProducts
                }));
            }

            if (data.daily_calorie_norm) {
                setMetrics(prev => ({
                    ...prev,
                    calories: data.daily_calorie_norm,
                    bmi: data.bmi || null,
                    bmiCategory: data.bmiCategory || ''
                }));
            }

            if (data.height_cm && data.weight_kg && data.age) {
                const activityValue = activityLevelToValue[data.activity_level || 'moderate'];
                const calorieData = await fetchCalories(activityValue);
                if (calorieData) {
                    setMetrics(prev => ({
                        ...prev,
                        calories: calorieData.dailyCalorieNorm,
                        bmr: calorieData.bmr.toString(),
                        proteins: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.3 / 4),
                        fats: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.25 / 9),
                        carbs: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.45 / 4)
                    }));
                }
            }
        }
        setIsLoadingData(false);
    };

    const updateCalories = async () => {
        if (!formData.height_cm || !formData.weight_kg || !formData.age) return;

        const activityValue = activityLevelToValue[formData.activityLevel];
        const calorieData = await fetchCalories(activityValue);

        if (calorieData) {
            setMetrics(prev => ({
                ...prev,
                calories: calorieData.dailyCalorieNorm,
                bmr: calorieData.bmr.toString(),
                proteins: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.3 / 4),
                fats: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.25 / 9),
                carbs: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.45 / 4)
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowError(false);
        setSaveSuccess(false);

        // Фильтруем только реальные продукты (не временные)
        const realFavoriteProductIds = products.favorite
            .map(p => p.id)
            .filter(id => id && !id.startsWith('temp'));

        const result = await saveProfile({
            gender: formData.gender,
            age: Number(formData.age),
            height_cm: Number(formData.height_cm),
            weight_kg: Number(formData.weight_kg),
            goal: goalToAPI[formData.goal],
            activity_level: formData.activityLevel,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
            dislikedProducts: products.notFavorite,
            favoriteProductIds: realFavoriteProductIds  // 👈 Только реальные ID
        });

        if (result.success) {
            setSaveSuccess(true);
            await loadProfileData();
            setTimeout(() => setSaveSuccess(false), 3000);
        } else {
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        }
    };

    const addFavoriteProduct = () => {
        if (!newFavoriteProduct.trim()) return;

        const productName = newFavoriteProduct.trim();

        // Примерная калорийность для популярных продуктов
        const knownProducts: Record<string, { calories: number, proteins: number, fats: number, carbs: number }> = {
            'авокадо': { calories: 160, proteins: 2, fats: 15, carbs: 9 },
            'курица': { calories: 165, proteins: 31, fats: 3.6, carbs: 0 },
            'куриная грудка': { calories: 165, proteins: 31, fats: 3.6, carbs: 0 },
            'гречка': { calories: 343, proteins: 13, fats: 3.4, carbs: 72 },
            'яйца': { calories: 155, proteins: 13, fats: 11, carbs: 1.1 },
            'бананы': { calories: 89, proteins: 1.1, fats: 0.3, carbs: 23 },
            'творог': { calories: 98, proteins: 11, fats: 2.5, carbs: 3.3 },
            'лосось': { calories: 208, proteins: 20, fats: 13, carbs: 0 },
            'рис': { calories: 130, proteins: 2.7, fats: 0.3, carbs: 28 },
            'овсянка': { calories: 68, proteins: 2.4, fats: 1.4, carbs: 12 },
            'миндаль': { calories: 579, proteins: 21, fats: 49, carbs: 22 },
            'хлеб': { calories: 265, proteins: 9, fats: 3.2, carbs: 49 },
            'макароны': { calories: 131, proteins: 5, fats: 1.1, carbs: 25 },
            'картофель': { calories: 77, proteins: 2, fats: 0.1, carbs: 17 },
            'помидоры': { calories: 18, proteins: 0.9, fats: 0.2, carbs: 3.9 },
            'огурцы': { calories: 15, proteins: 0.7, fats: 0.1, carbs: 3.6 },
            'сыр': { calories: 402, proteins: 25, fats: 33, carbs: 1.3 },
            'молоко': { calories: 42, proteins: 3.4, fats: 1, carbs: 4.8 },
            'йогурт': { calories: 59, proteins: 10, fats: 0.4, carbs: 3.6 },
            'греческий йогурт': { calories: 59, proteins: 10, fats: 0.4, carbs: 3.6 }
        };

        const lowerName = productName.toLowerCase();
        const known = knownProducts[lowerName];

        const tempProduct: FavoriteProduct = {
            id: `temp-${Date.now()}`,
            name: productName,
            calories_kcal: known?.calories || 0,
            proteins_g: known?.proteins || 0,
            fats_g: known?.fats || 0,
            carbs_g: known?.carbs || 0
        };

        setProducts(prev => ({
            ...prev,
            favorite: [...prev.favorite, tempProduct]
        }));
        setNewFavoriteProduct('');
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

    const removeFavoriteProduct = (productId: string) => {
        setProducts(prev => ({
            ...prev,
            favorite: prev.favorite.filter(p => p.id !== productId)
        }));
    };

    const removeNotFavoriteProduct = (productToRemove: string) => {
        setProducts(prev => ({
            ...prev,
            notFavorite: prev.notFavorite.filter(p => p !== productToRemove)
        }));
    };

    useEffect(() => {
        loadProfileData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGenderChange = (gender: 'M' | 'Ж') => {
        setFormData(prev => ({ ...prev, gender }));
    };

    const handleGoalChange = (goal: 'weight_loss' | 'maintenance' | 'weight_gain') => {
        setFormData(prev => ({ ...prev, goal }));
        setTimeout(() => updateCalories(), 0);
    };

    const handleActivityLevelChange = (level: string) => {
        const mappedLevel = valueToActivityLevel[level];
        if (mappedLevel) {
            setFormData(prev => ({ ...prev, activityLevel: mappedLevel as 'minimal' | 'moderate' | 'high' }));
            setTimeout(() => updateCalories(), 100);
        }
    };

    const handleNameChange = (name: string) => {
        setFormData(prev => ({ ...prev, name }));
    };

    const handleMetricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setTimeout(() => updateCalories(), 100);
    };

    if (isLoadingData) {
        return (
            <div className="w-full bg-[#FFFFE6] min-h-screen flex items-center justify-center">
                <div className="text-[#58B079] text-xl">Загрузка профиля...</div>
            </div>
        );
    }

    return (
        <section className="w-full bg-[#FFFFE6] min-h-screen py-8 lg:py-12">
            <div className="max-w-6xl mx-auto px-6 lg:px-12">
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

                <form onSubmit={handleSubmit}>
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

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4">Краткая информация</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22241E] w-20">E-mail:</span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="flex-1 px-3 py-1 bg-[#F0F0F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                        placeholder="example@mail.com"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22241E] w-20">Телефон:</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="flex-1 px-3 py-1 bg-[#F0F0F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                        placeholder="+7 (999) 123-45-67"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#22241E] w-20">Статус:</span>
                                    <input
                                        type="text"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="flex-1 px-3 py-1 bg-[#F0F0F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#58B079]"
                                        placeholder="Активен"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <ProfileMetrics
                            metrics={metrics}
                            formData={formData}
                            errors={errors}
                            onInputChange={handleMetricChange}
                            onGenderChange={handleGenderChange}
                        />

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4 text-center">Цель питания</h3>

                            <GoalSelector
                                selectedGoal={formData.goal}
                                onGoalChange={handleGoalChange}
                            />

                            <ActivityLevel
                                selectedLevel={activityLevelToValue[formData.activityLevel]}  // 'minimal' -> '1.2'
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

                    <div className="mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4 text-center">
                                Любимые и нелюбимые продукты
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                {products.favorite.map((product) => (
                                                    <div key={product.id} className="flex items-center gap-1 bg-[#F0F0F0] rounded-full px-3 py-1">
                                                        <span className="text-[#22241E] text-sm">{product.name}</span>
                                                        <span className="text-[#58B079] text-xs ml-1">
                                                            ({product.calories_kcal} ккал)
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFavoriteProduct(product.id)}
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
                                                    placeholder="Например: Лосось, Киноа, Миндаль..."
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
                                        <span>Нелюбимые продукты:</span>
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
                                                    placeholder="Например: Шпинат, Оливки, Тыква..."
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