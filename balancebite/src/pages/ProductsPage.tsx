import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';

interface Product {
  id: string;
  name: string;
  calories_kcal: number;
  proteins_g: number;
  fats_g: number;
  carbs_g: number;
  is_custom: boolean;
  source?: 'usda' | 'custom';
}

export const ProductsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); // 🔥 1. Стейт для Debounce
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 14;

  // Filters (🔥 3. Объединили логику сортировки)
  const [sortField, setSortField] = useState('popular');
  const [sortOrder, setSortOrder] = useState('desc');

  // 🔥 4. Стейт для выбора приема пищи
  const [selectedMeal, setSelectedMeal] = useState('breakfast');

  // 🔥 Безопасное преобразование к числу
  const toNumber = (value: any, fallback: number = 0): number => {
    if (value === null || value === undefined || value === '') return fallback;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? fallback : num;
  };

  // 🔥 1. Эффект для Debounce (задержка поиска)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      // 🔥 2. Сброс на 1 страницу при новом поиске
      if (searchQuery !== debouncedQuery) {
        setCurrentPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedQuery]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy: sortField,
        order: sortOrder,
      });

      const response = await fetch(`http://localhost:3001/api/products?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.success) {
          const rawProducts = data.data.products || [];
          const uniqueProductsMap = new Map<string, Product>();

          rawProducts.forEach((p: any) => {
            const normalizedName = p.name.toLowerCase().trim();
            if (!uniqueProductsMap.has(normalizedName)) {
              uniqueProductsMap.set(normalizedName, {
                id: p.id,
                name: p.name,
                // Превращаем строки в реальные числа для корректного сравнения
                calories_kcal: toNumber(p.calories_kcal, 0),
                proteins_g: toNumber(p.proteins_g, 0),
                fats_g: toNumber(p.fats_g, 0),
                carbs_g: toNumber(p.carbs_g, 0),
                is_custom: p.is_custom || false,
                source: p.source || (p.is_custom ? 'custom' : 'usda'),
              });
            }
          });

          let uniqueProducts = Array.from(uniqueProductsMap.values());

          // 🔥 КЛИЕНТСКАЯ СОРТИРОВКА (Финальный штрих)
          if (sortField && sortField !== 'popular') {
            uniqueProducts.sort((a: any, b: any) => {
              const valA = a[sortField];
              const valB = b[sortField];

              if (typeof valA === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
              }

              return sortOrder === 'asc' ? valA - valB : valB - valA;
            });
          }

          setProducts(uniqueProducts);
          setTotalPages(data.data.pagination?.totalPages || 1);
        }
      } else {
        setError('Ошибка загрузки продуктов');
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Не удалось загрузить продукты');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем при изменении нужных стейтов
  useEffect(() => {
    loadProducts();
  }, [debouncedQuery, currentPage, sortField, sortOrder]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // 🔥 2. Обработчик для фильтров, чтобы сбрасывать страницу
  const handleSortChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleAddToMeal = async (product: Product, quantity: number, mealType: string) => {
    try {
      // Формируем тело запроса согласно твоему бэкенду
      const body = {
        date: new Date().toISOString().split('T')[0], // Сегодняшняя дата
        meal_name: mealType, // "breakfast", "lunch" и т.д.
        product_id: product.id, // ID продукта
        quantity_g: quantity, // Вес
        meal_time: new Date().toLocaleTimeString('it-IT'), // Текущее время (HH:mm:ss)
      };

      const response = await fetch('http://localhost:3001/api/diary/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`✅ ${product.name} добавлен в ${mealType}!`);
      } else {
        console.error('Ошибка бэкенда:', result.error || result.message);
        alert('Ошибка при добавлении: ' + (result.error || 'Неизвестная ошибка'));
      }
    } catch (err) {
      console.error('Ошибка сети:', err);
      alert('Не удалось связаться с сервером');
    }
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
            <a
              href="/diary"
              className="text-[16px] text-[#22241E] hover:text-[#58B079] transition-colors"
            >
              Дневник питания
            </a>
            <a
              href="/analytics"
              className="text-[16px] text-[#22241E] hover:text-[#58B079] transition-colors"
            >
              Аналитика
            </a>
            <a href="/products" className="text-[16px] font-bold text-[#58B079] transition-colors">
              База продуктов
            </a>
          </div>
          <a href="/profile" className="w-[37px] h-[37px] bg-[#58B079] rounded-full"></a>
        </nav>

        {/* Поиск и фильтры */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
                placeholder="Поиск продуктов..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-[12px] pl-12 pr-4 py-3 outline-none text-[15px] placeholder-[#8E8E93] shadow-sm"
              />
            </div>
          </form>

          {/* Фильтры */}
          <div className="flex gap-3 flex-wrap items-center">
            {/* 🔥 3. Объединенный селект сортировки */}
            <select
              value={sortField}
              onChange={(e) => handleSortChange(setSortField, e.target.value)}
              className="bg-white px-4 py-2 rounded-[10px] outline-none text-[14px] cursor-pointer shadow-sm"
            >
              <option value="popular">По популярности</option>
              <option value="name">По названию</option>
              <option value="calories_kcal">По калориям</option>
              <option value="proteins_g">По белкам</option>
              <option value="fats_g">По жирам</option>
              <option value="carbs_g">По углеводам</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(setSortOrder, e.target.value)}
              className="bg-white px-4 py-2 rounded-[10px] outline-none text-[14px] cursor-pointer shadow-sm"
            >
              <option value="desc">По убыванию</option>
              <option value="asc">По возрастанию</option>
            </select>

            {/* Разделитель */}
            <div className="h-6 w-[1px] bg-gray-300 mx-1 hidden md:block"></div>

            {/* 🔥 4. Селектор приема пищи (вписывается в ваш дизайн) */}
            <span className="text-[14px] text-gray-600">Добавить в:</span>
            <select
              value={selectedMeal}
              onChange={(e) => setSelectedMeal(e.target.value)}
              className="bg-[#58B079] text-white px-4 py-2 rounded-[10px] outline-none text-[14px] cursor-pointer shadow-sm font-medium"
            >
              <option value="breakfast">Завтрак</option>
              <option value="lunch">Обед</option>
              <option value="dinner">Ужин</option>
              <option value="snack">Перекус</option>
            </select>
          </div>
        </div>

        {/* Список продуктов */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Загрузка продуктов...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-[12px] p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-[15px] font-semibold text-[#58B079] mb-1">
                        {product.name}
                      </h3>
                      <p className="text-[14px] text-[#22241E] mb-2">
                        {Math.round(product.calories_kcal)} ккал
                      </p>
                      <p className="text-[13px] text-gray-600">
                        Б:{Math.round(product.proteins_g)} Ж:{product.fats_g.toFixed(1)} У:
                        {product.carbs_g.toFixed(1)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToMeal(product, 100, selectedMeal)}
                      className="flex items-center gap-1 text-[13px] text-[#58B079] hover:text-[#4a9e66] transition-colors ml-4"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#58B079">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      Добавить
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-400">Продукты не найдены</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
