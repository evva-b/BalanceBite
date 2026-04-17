import React from 'react';
import pinIcon from '../assets/pin.svg';

export const Features: React.FC = () => {
  const features = [
    {
      title: 'Точная аналитика',
      description:
        'Наглядные графики веса, калорий и нутриентов помогают видеть прогресс и оставаться мотивированными.',
      titleColor: 'text-[#1F2937]', // black
      rotation: '-rotate-2',
      top: 'top-0',
      left: 'left-0',
    },
    {
      title: 'Мгновенное добавление',
      description:
        'Ищите продукты в базе, сканируйте штрих-коды или добавляйте свои рецепты — всё за несколько секунд.',
      titleColor: 'text-[#A855F7]', // purple
      rotation: 'rotate-3',
      top: 'lg:-top-12',
      left: 'lg:left-12',
    },
    {
      title: 'Локальные продукты',
      description:
        'Больше не нужно мучиться с ручным вводом — наша база знает даже российские бренды.',
      titleColor: 'text-[#A855F7]', // purple
      rotation: 'rotate-6',
      top: 'lg:top-24',
      left: 'lg:left-24',
    },
    {
      title: 'Персональный подход',
      description:
        'Укажите свою цель (похудение, поддержание веса или набор массы) — и система подстроится!',
      titleColor: 'text-[#A855F7]', // фиолетовый
      rotation: '-rotate-3',
      // ИЗМЕНЕНИЕ ЗДЕСЬ: Сдвигаем карточку вверх на больших экранах
      marginTop: 'lg:-mt-8',
    },
    {
      title: 'Расчет норм',
      description:
        'Мгновенный расчет ИМТ и суточной нормы калорий на основе вашего роста, веса и возраста.',
      titleColor: 'text-[#1F2937]', // black
      rotation: 'rotate-1',
      top: 'lg:-top-8',
      left: 'lg:left-16',
    },
  ];

  return (
    <section className="w-full py-20 bg-[#8CDF75]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h2 className="text-4xl font-['Jost'] font-bold text-white text-center mb-16">
          Почему тысячи пользователей выбирают BalanceBite?
        </h2>

        <div className="relative grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`
                relative bg-white rounded-2xl p-8 shadow-lg 
                ${feature.rotation} 
                ${feature.top} 
                ${feature.left}
                hover:rotate-0 
                transition-transform 
                duration-300
                ${index === 0 ? 'md:col-start-1' : ''}
                ${index === 1 ? 'md:col-start-2 lg:col-start-auto' : ''}
                ${index === 2 ? 'md:col-start-2 lg:col-start-auto' : ''}
                ${index === 3 ? 'md:col-start-1' : ''}
                ${index === 4 ? 'md:col-start-2' : ''}
              `}
            >
              {/* Purple pin icon */}
              <div className="flex justify-center mb-1">
                <img src={pinIcon} alt="pin" className="w-12 h-12 object-contain" />
              </div>

              <h3
                className={`text-xl font-['Jost'] font-semibold mb-3 text-center ${feature.titleColor}`}
              >
                {feature.title}
              </h3>

              <p className="text-[#6B7280] text-center text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
