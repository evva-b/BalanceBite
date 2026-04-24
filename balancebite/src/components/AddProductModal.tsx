import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

interface AddProductModalProps {
  mealName: string;
  date: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Product {
  id: string;
  name: string;
  calories_kcal: number;
  proteins_g: number;
  fats_g: number;
  carbs_g: number;
  source: 'usda' | 'custom';
}

export function AddProductModal({ mealName, date, onClose, onSuccess }: AddProductModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');

  // Состояния для поиска
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [weight, setWeight] = useState<string>('100');
  const [selectedMealType, setSelectedMealType] = useState(mealName || 'Завтрак');
  const [mealTime, setMealTime] = useState<string>(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [loading, setLoading] = useState(false);

  // Состояния для ручного ввода
  const [customData, setCustomData] = useState({
    name: '',
    calories: '',
    proteins: '',
    fats: '',
    carbs: '',
  });

  const mealTypes = ['Завтрак', 'Обед', 'Ужин', 'Перекус'];

  // 🔍 Поиск продуктов — ОДИН запрос, без дубликатов
  useEffect(() => {
    const searchProducts = async () => {
      if (query.trim().length < 2) {
        setProducts([]);
        return;
      }
      setLoading(true);
      try {
        // 🔥 ОДИН запрос к /api/products — он уже объединяет все источники
        const res = await axios.get('http://localhost:3001/api/products', {
          params: {
            q: query.trim(),
            page: 1,
            limit: 50,
            sortBy: 'name',
            order: 'asc',
          },
          withCredentials: true,
        });

        const rawProducts = res.data?.data?.products || res.data?.data || [];

        // 🔥 Убираем дубликаты по имени + источнику
        const uniqueProducts = rawProducts.reduce((acc: Product[], p: any) => {
          const key = `${p.name.toLowerCase().trim()}_${p.source || 'usda'}`;
          if (
            !acc.find(
              (item: Product) =>
                item.name.toLowerCase().trim() === p.name.toLowerCase().trim() &&
                (item.source || 'usda') === (p.source || 'usda'),
            )
          ) {
            acc.push({
              id: p.id,
              name: p.name,
              calories_kcal: parseFloat(p.calories_kcal) || 0,
              proteins_g: parseFloat(p.proteins_g) || 0,
              fats_g: parseFloat(p.fats_g) || 0,
              carbs_g: parseFloat(p.carbs_g) || 0,
              source: p.source || (p.is_custom ? 'custom' : 'usda'),
            });
          }
          return acc;
        }, []);

        setProducts(uniqueProducts);
      } catch (err) {
        console.error('Search error:', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  // ➕ Добавить из поиска
  const handleAddFromSearch = async () => {
    if (!selectedProduct || !weight) return;
    try {
      await axios.post(
        `http://localhost:3001/api/products/${selectedProduct.id}/add-to-diary`,
        {
          quantity_g: parseInt(weight) || 100,
          custom_meal_name: selectedMealType,
          custom_meal_time: `${mealTime}:00`,
        },
        { withCredentials: true },
      );
      onSuccess();
    } catch (err: any) {
      console.error('Add error:', err);
      alert(err.response?.data?.error || 'Ошибка добавления продукта');
    }
  };

  // ➕ Добавить ручной ввод
  const handleAddCustom = async () => {
    try {
      await axios.post(
        'http://localhost:3001/api/diary/meals',
        {
          date,
          meal_time: `${mealTime}:00`,
          meal_name: selectedMealType,
          entries: [
            {
              name: customData.name,
              quantity_g: 100,
              manual_data: {
                calories: parseFloat(customData.calories) || 0,
                proteins: parseFloat(customData.proteins) || 0,
                fats: parseFloat(customData.fats) || 0,
                carbs: parseFloat(customData.carbs) || 0,
              },
            },
          ],
        },
        { withCredentials: true },
      );
      onSuccess();
    } catch (err: any) {
      console.error('Custom add error:', err);
      alert(err.response?.data?.error || 'Ошибка добавления');
    }
  };

  // Расчёт калорий для превью
  const calculatedCalories = useMemo(() => {
    if (!selectedProduct || !weight) return 0;
    return Math.round((selectedProduct.calories_kcal / 100) * (parseFloat(weight) || 0));
  }, [selectedProduct, weight]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      {/* 🔥 КОНТЕЙНЕР МОДАЛКИ С ПРОКРУТКОЙ */}
      <div className="bg-white w-full max-w-[480px] rounded-t-[24px] sm:rounded-[24px] px-5 py-6 sm:p-8 animate-slide-up flex flex-col max-h-[90vh]">
        {/* Шапка — фиксирована */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-[22px] font-bold text-[#1A1A1A]">Добавление приёма пищи</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Переключатель вкладок — фиксирован */}
        <div className="flex bg-[#F2F2F7] rounded-[10px] p-[2px] mb-6 shrink-0">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 text-[14px] font-medium rounded-[8px] transition-all ${
              activeTab === 'search'
                ? 'bg-[#D974E6] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                : 'text-[#8E8E93]'
            }`}
          >
            Поиск в базе
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 text-[14px] font-medium rounded-[8px] transition-all ${
              activeTab === 'custom'
                ? 'bg-[#D974E6] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
                : 'text-[#8E8E93]'
            }`}
          >
            Ручной ввод
          </button>
        </div>

        {/* 🔥 СКРОЛЛИРУЕМЫЙ КОНТЕНТ */}
        <div className="flex-1 overflow-y-auto pb-4">
          {/* === ВКЛАДКА: ПОИСК === */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              {/* Поле поиска */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Кабачок, курица, рис..."
                  className="w-full bg-[#F2F2F7] rounded-[12px] pl-10 pr-4 py-3 outline-none text-[15px] placeholder-[#8E8E93]"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {/* Результаты поиска */}
              {query.length >= 2 && (
                <div className="text-[13px] text-[#58B079] font-medium">
                  ▼ Найдено: {products.length}
                </div>
              )}

              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">Загрузка...</div>
                ) : products.length === 0 && query.length >= 2 ? (
                  <div className="text-center py-8 text-gray-400">Ничего не найдено</div>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`p-3 rounded-[10px] cursor-pointer transition-all ${
                        selectedProduct?.id === product.id
                          ? 'bg-[#E8F5E9] border-2 border-[#58B079]'
                          : 'bg-white border border-[#E5E5EA] hover:border-[#D974E6]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-[15px] font-semibold text-[#1A1A1A]">{product.name}</p>
                          <p className="text-[13px] text-gray-600 mt-1">
                            Б: {product.proteins_g}г Ж: {product.fats_g}г У: {product.carbs_g}г
                            /100г · {product.calories_kcal} ккал
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center ml-3 ${
                            selectedProduct?.id === product.id ? 'bg-[#58B079]' : 'bg-[#E5E5EA]'
                          }`}
                        >
                          {selectedProduct?.id === product.id && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Поля при выборе продукта */}
              {selectedProduct && (
                <div className="pt-4 border-t border-[#E5E5EA] space-y-3">
                  {/* Вес порции */}
                  <div>
                    <label className="block text-[13px] text-[#8E8E93] mb-2">Вес порции (г):</label>
                    <input
                      type="number"
                      min="1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-4 py-2.5 outline-none text-[15px] focus:ring-2 focus:ring-[#D974E6]"
                    />
                  </div>

                  {/* Приём пищи */}
                  <div>
                    <label className="block text-[13px] text-[#8E8E93] mb-2">Приём пищи:</label>
                    <select
                      value={selectedMealType}
                      onChange={(e) => setSelectedMealType(e.target.value)}
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-4 py-2.5 outline-none text-[15px] appearance-none cursor-pointer focus:ring-2 focus:ring-[#D974E6]"
                    >
                      {mealTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Время */}
                  <div>
                    <label className="block text-[13px] text-[#8E8E93] mb-2">Время:</label>
                    <input
                      type="time"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                      className="w-full bg-[#F2F2F7] rounded-[10px] px-4 py-2.5 outline-none text-[15px] focus:ring-2 focus:ring-[#D974E6]"
                    />
                  </div>

                  {/* Превью КБЖУ */}
                  <div className="bg-[#F9F9F9] rounded-[10px] p-3 text-[13px] text-gray-600">
                    На {weight}г: {calculatedCalories} ккал
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === ВКЛАДКА: РУЧНОЙ ВВОД === */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5 ml-1">
                  Название продукта
                </label>
                <input
                  type="text"
                  placeholder="Например: Сырники домашние"
                  className="w-full border border-[#E5E5EA] rounded-[12px] px-4 py-3 outline-none text-[15px] focus:border-[#D974E6]"
                  value={customData.name}
                  onChange={(e) => setCustomData({ ...customData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'calories' as const, label: 'Калории (ккал) *', placeholder: '0' },
                  { key: 'proteins' as const, label: 'Белки (г)', placeholder: '0' },
                  { key: 'fats' as const, label: 'Жиры (г)', placeholder: '0' },
                  { key: 'carbs' as const, label: 'Углеводы (г)', placeholder: '0' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5 ml-1">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder={field.placeholder}
                      className="w-full border border-[#E5E5EA] rounded-[12px] px-4 py-3 outline-none text-[15px] focus:border-[#D974E6]"
                      value={customData[field.key]}
                      onChange={(e) =>
                        setCustomData({ ...customData, [field.key]: e.target.value })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🔥 КНОПКИ — фиксированы внизу */}
        <div className="flex gap-3 pt-4 border-t border-[#E5E5EA] shrink-0 mt-2">
          <button
            onClick={activeTab === 'search' ? handleAddFromSearch : handleAddCustom}
            disabled={
              activeTab === 'search' ? !selectedProduct : !customData.name || !customData.calories
            }
            className="flex-1 bg-[#8CDF75] text-white py-3 rounded-[12px] font-semibold text-[16px] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            + Добавить
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#E5E5EA] text-[#1A1A1A] py-3 rounded-[12px] font-semibold text-[16px] hover:bg-[#D1D1D6] transition-colors"
          >
            ✕ Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
