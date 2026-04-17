// Footer.tsx
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#8CDF75] py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* 1. Логотип на белом фоне с плавными краями */}
          <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm flex items-center justify-center">
            <img
              src="/src/assets/logo.svg"
              alt="BalanceBite Logo"
              className="w-36 h-9 object-contain"
            />
          </div>

          {/* 2. Копирайт тёмного цвета - увеличенный */}
          <div className="text-[#111827] text-base lg:text-lg font-medium text-center">
            © Все права защищены 2026
          </div>

          {/* 3. Контакты тёмного цвета - увеличенные */}
          <div className="text-[#111827] text-base lg:text-lg text-center lg:text-right">
            <div className="font-semibold text-[#fff]">support@balancebite.ru</div>
            <div className="text-sm mt-1">по общим вопросам</div>
          </div>
        </div>
      </div>
    </footer>
  );
};
