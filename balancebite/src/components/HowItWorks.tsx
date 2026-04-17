import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '1',
      title: 'Заполните профиль',
      image: '/src/assets/il1.svg', // Замени на путь к картинке из Image ID: 2
    },
    {
      number: '2',
      title: 'Ведите дневник питания',
      image: '/src/assets/il2.svg', // Замени на картинку с дневником
    },
    {
      number: '3',
      title: 'Получайте аналитику',
      image: '/src/assets/il3.svg', // Замени на картинку с роботом/аналитикой
    },
    {
      number: '4',
      title: 'Следите за прогрессом',
      image: '/src/assets/il4.svg', // Замени на картинку с кубком/прогрессом
    },
  ];

  return (
    <section className="w-full bg-[#FFFFE6] py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-6 lg:px-12">
        <h2 className="text-3xl lg:text-4xl font-['Jost'] font-bold text-[#8CDF75] text-center mb-12 lg:mb-16">
          Как это работает?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center group">
              {/* Заголовок: цифра + текст на одном уровне */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 bg-[#8CDF75] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {step.number}
                </div>
                <h3 className="text-xl font-['Jost'] font-bold text-[#111827]">{step.title}</h3>
              </div>

              {/* Картинка без зеленого круга (фон уже в ассете) */}
              <img
                src={step.image}
                alt={step.title}
                className="w-full max-w-[300px] h-auto object-contain drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
