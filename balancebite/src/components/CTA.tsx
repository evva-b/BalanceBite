// CTA.tsx
import React from 'react';
import { Link } from 'react-router-dom';

export const CTA: React.FC = () => {
  return (
    <section className="w-full bg-[#FFFFE6] py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
        {/* Заголовок: строго по центру, в одну строку */}
        <div className="flex justify-center mb-6">
          <h2 className="text-2xl lg:text-3xl xl:text-4xl font-['Jost'] font-bold text-[#8CDF75] whitespace-nowrap">
            Начните свой путь к здоровому балансу уже сегодня!
          </h2>
        </div>

        {/* Текст темного цвета, как в дизайне - увеличенный */}
        <p className="text-[#111827] mb-4 leading-relaxed font-medium text-lg lg:text-xl">
          Присоединяйтесь к тысячам пользователей, которые сделали питание осознанным и простым с
          помощью BalanceBite.
        </p>

        <p className="text-[#6B7280] text-base lg:text-lg italic mb-10">
          *Это бесплатно и занимает всего 1 минуту*
        </p>

        {/* Кнопка в виде фиолетового баннера с рваными краями */}
        <div className="flex justify-center">
          <div className="relative inline-block group">
            {/* Анимированный фоновый эффект */}
            <div
              className="absolute inset-0 bg-purple-400 transform -skew-y-3 rounded-lg 
                    transition-all duration-300 group-hover:scale-105 group-hover:skew-y-0
                    group-hover:shadow-xl group-hover:shadow-purple-400/50"
            ></div>

            {/* Дополнительный слой для эффекта свечения */}
            <div
              className="absolute inset-0 bg-purple-300 transform -skew-y-3 rounded-lg opacity-0
                    transition-all duration-300 group-hover:opacity-50 group-hover:scale-110
                    blur-md"
            ></div>

            {/* Кнопка */}
            <Link
              to="/register"
              className="relative px-12 py-4 bg-purple-500 text-white font-bold text-xl rounded-lg 
                       transition-all duration-300 transform 
                       group-hover:-translate-y-1 group-hover:scale-105
                       group-hover:shadow-lg group-hover:shadow-purple-500/30
                       active:translate-y-0 active:scale-95
                       overflow-hidden"
            >
              {/* Эффект блика при наведении */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                       transform -skew-x-12 -translate-x-full 
                       group-hover:translate-x-full transition-transform duration-700 ease-out"
              ></span>

              {/* Текст кнопки */}
              <span className="relative z-10 flex items-center justify-center gap-2">
                РЕГИСТРАЦИЯ
                {/* Стрелка, появляющаяся при наведении */}
                <svg
                  className="w-6 h-6 transform transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
