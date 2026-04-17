import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/authApi';
import { AuthLayout } from '../components/auth/AuthLayout';

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const inputClassName = `w-full h-12 md:h-14 rounded-full bg-[#EFEFEF] px-5 md:px-6 text-[16px] md:text-[20px] text-[#8A8A8A] placeholder:text-[#B0B0B0] outline-none border ${
    error ? 'border-[#E05A5A]' : 'border-transparent'
  }`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ email, password });
      navigate('/');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка регистрации');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Регистрация"
      footerText="Есть аккаунт?"
      footerLinkText="Войти"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        {error ? (
          <p className="w-full max-w-[420px] mx-auto rounded-[14px] bg-[#F0C4C4] border border-[#D87575] text-[#944E4E] text-[16px] md:text-[22px] leading-tight text-center px-4 py-2.5">
            {error}
          </p>
        ) : null}

        <input
          type="email"
          placeholder="Введите e-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          required
        />

        <input
          type="password"
          placeholder="Введите пароль"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClassName}
          required
          minLength={8}
        />

        <input
          type="password"
          placeholder="Повторите пароль"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClassName}
          required
          minLength={8}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full max-w-[320px] md:max-w-[360px] h-12 md:h-14 rounded-full bg-[#58B079] text-white text-[20px] md:text-[28px] leading-none mx-auto block hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        <p className="text-center text-sm sm:text-base text-[#6f6f6f]">
          Вернуться на{' '}
          <Link to="/" className="underline">
            главную
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
