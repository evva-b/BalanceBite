import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';

export const Header: React.FC = () => {
  return (
    <header className="w-full px-8 py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="BalanceBite Logo" className="w-60 h-11 object-contain" />
        </Link>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-8 py-2.5 bg-[#8CDF75] text-[#fff] rounded-full font-medium hover:bg-[#4ADE80] transition-colors"
          >
            Войти
          </Link>
          <Link
            to="/register"
            className="px-8 py-2.5 bg-[#58B079] text-white rounded-full font-medium hover:bg-[#22C55E] transition-colors"
          >
            Регистрация
          </Link>
        </div>
      </div>
    </header>
  );
};
