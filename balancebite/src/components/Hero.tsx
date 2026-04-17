import React from 'react';

export const Hero: React.FC = () => {
  const heroImage = '/src/assets/hero.png';

  return (
    <section className="w-full min-h-[calc(100vh-80px)] bg-[#FFFFE6] flex items-center py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          {/* ЛЕВАЯ ЧАСТЬ: Иллюстрация */}
          <div className="flex justify-center lg:justify-start order-1">
            <img
              src={heroImage}
              alt="Diet Plan Character"
              className="w-full max-w-lg lg:max-w-xl h-auto object-contain drop-shadow-xl"
            />
          </div>

          {/* ПРАВАЯ ЧАСТЬ: Текст */}
          <div className="flex flex-col text-center lg:text-left gap-6 order-2">
            {/* Заголовок 1: Green "BalanceBite" */}
            <h1 className="text-5xl lg:text-6xl font-['Jost'] font-bold text-[#8CDF75]">
              BalanceBite
            </h1>

            {/* Заголовок 2: Black Subtitle */}
            <h2 className="text-3xl lg:text-4xl font-['Jost'] font-bold text-[#111827] leading-tight">
              первый шаг к осознанному питанию с продвинутым анализом.
            </h2>

            {/* Описание: Grey Text */}
            <p className="text-lg text-[#6B7280] leading-relaxed max-w-xl mx-auto lg:mx-0">
              BalanceBite — это веб-приложение, созданное для решения главной проблемы
              пользователей: отсутствия системности и удобного инструмента для ведения здорового
              рациона. Мы объединили точные данные и современные технологии, чтобы помочь вам легко
              управлять своим питанием.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
