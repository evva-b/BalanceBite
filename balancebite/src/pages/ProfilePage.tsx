import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProfileAPI, ProfileMetrics } from '../features/FR-201';
import { GoalSelector, ActivityLevel, CaloriesDisplay, useCalorieAPI } from '../features/FR-204';
import logo from '../assets/logo.svg';

interface FormDataType {
    name: string;
    gender: string;
    age: string;
    height_cm: string;
    weight_kg: string;
    goal: string;
    activityLevel: string;
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
        gender: 'male',
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
        favorite: [],
        notFavorite: []
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

    // Маппинг уровней активности для UI
    const activityLevelToUI = {
        'minimal': '1.2',
        'moderate': '1.55',
        'high': '1.725'
    };

    const uiToActivityLevel = {
        '1.2': 'minimal',
        '1.55': 'moderate',
        '1.725': 'high'
    };

    // Маппинг целей для API
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

    // Маппинг пола для API
    const genderToAPI = {
        'male': 'M',
        'female': 'Ж'
    };

    const apiToGender = {
        'M': 'male',
        'Ж': 'female'
    };

    // Загрузка профиля
    const loadProfileData = async () => {
        setIsLoadingData(true);
        const data = await loadProfile();
        if (data) {
            setFormData({
                name: data.email?.split('@')[0] || '',
                gender: apiToGender[data.gender] || 'male',
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
        }
        setIsLoadingData(false);
    };

    // Обновление калорий
    const updateCalories = async () => {
        if (!formData.height_cm || !formData.weight_kg || !formData.age) return;

        const activityValue = activityLevelToUI[formData.activityLevel];
        const calorieData = await fetchCalories(activityValue);

        if (calorieData) {
            setMetrics(prev => ({
                ...prev,
                calories: calorieData.dailyCalorieNorm,
                bmr: calorieData.bmr?.toString() || '',
                proteins: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.3 / 4),
                fats: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.25 / 9),
                carbs: Math.round((calorieData.dailyCalorieNorm || 2000) * 0.45 / 4)
            }));
        }
    };

    // Сохранение профиля
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowError(false);
        setSaveSuccess(false);

        // Фильтруем только реальные продукты (не временные)
        const realFavoriteProductIds = products.favorite
            .map(p => p.id)
            .filter(id => id && !id.startsWith('temp'));

        const result = await saveProfile({
            gender: genderToAPI[formData.gender as keyof typeof genderToAPI] || 'M',
            age: Number(formData.age),
            height_cm: Number(formData.height_cm),
            weight_kg: Number(formData.weight_kg),
            goal: goalToAPI[formData.goal as keyof typeof goalToAPI] || 'Поддержание веса',
            activity_level: formData.activityLevel,
            email: formData.email,
            phone: formData.phone,
            status: formData.status,
            dislikedProducts: products.notFavorite,
            favoriteProductIds: realFavoriteProductIds
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

    // Добавление любимого продукта
    const addFavoriteProduct = () => {
        if (!newFavoriteProduct.trim()) return;

        const productName = newFavoriteProduct.trim();

        const tempProduct: FavoriteProduct = {
            id: `temp-${Date.now()}`,
            name: productName,
            calories_kcal: 0,
            proteins_g: 0,
            fats_g: 0,
            carbs_g: 0
        };

        setProducts(prev => ({
            ...prev,
            favorite: [...prev.favorite, tempProduct]
        }));
        setNewFavoriteProduct('');
    };

    // Добавление нелюбимого продукта
    const addNotFavoriteProduct = () => {
        if (newNotFavoriteProduct.trim()) {
            setProducts(prev => ({
                ...prev,
                notFavorite: [...prev.notFavorite, newNotFavoriteProduct.trim()]
            }));
            setNewNotFavoriteProduct('');
        }
    };

    // Удаление любимого продукта
    const removeFavoriteProduct = (productId: string) => {
        setProducts(prev => ({
            ...prev,
            favorite: prev.favorite.filter(p => p.id !== productId)
        }));
    };

    // Удаление нелюбимого продукта
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

    const handleGenderChange = (gender: string) => {
        setFormData(prev => ({ ...prev, gender }));
    };

    const handleGoalChange = (goal: string) => {
        setFormData(prev => ({ ...prev, goal }));
        setTimeout(() => updateCalories(), 100);
    };

    const handleActivityLevelChange = (level: string) => {
        // level приходит как '1.2', '1.55' или '1.725'
        const mappedLevel = uiToActivityLevel[level];
        if (mappedLevel) {
            setFormData(prev => ({ ...prev, activityLevel: mappedLevel }));
            setTimeout(() => updateCalories(), 100);
        }
    };

    const handleNameChange = (name: string) => {
        setFormData(prev => ({ ...prev, name }));
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
                {/* Верхняя панель навигации */}
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

                {/* Сообщение об успешном сохранении */}
                {saveSuccess && (
                    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fadeOut">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-xl">
                            Профиль успешно сохранен!
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

                    {/* Блоки: мои показатели + цель питания */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <ProfileMetrics
                            metrics={metrics}
                            formData={{
                                age: formData.age,
                                height_cm: formData.height_cm,
                                weight_kg: formData.weight_kg,
                                gender: formData.gender
                            }}
                            errors={errors}
                            onInputChange={handleInputChange}
                            onGenderChange={handleGenderChange}
                        />

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4 text-center">Цель питания</h3>

                            <GoalSelector
                                selectedGoal={formData.goal as 'weight_loss' | 'maintenance' | 'weight_gain'}
                                onGoalChange={handleGoalChange}
                            />

                            <ActivityLevel
                                selectedLevel={activityLevelToUI[formData.activityLevel]}
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

                    {/* Любимые и НЕлюбимые продукты */}
                    <div className="mb-8">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="text-[#58B079] font-bold text-lg mb-4 text-center">
                                Любимые и нелюбимые продукты
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Любимые продукты */}
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
                                                        {product.calories_kcal > 0 && (
                                                            <span className="text-[#58B079] text-xs ml-1">
                                                                ({product.calories_kcal} ккал)
                                                            </span>
                                                        )}
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
                                                    placeholder="Например: Курица, Авокадо, Гречка..."
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

                                {/* НЕлюбимые продукты */}
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
                                                    placeholder="Например: Рыба, Брокколи, Печень..."
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