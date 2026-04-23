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
    const inputClassName = `w-full h-12 md:h-14 rounded-full bg-[#EFEFEF] px-5 md:px-6 text-[16px] md:text-[18px] text-[#8A8A8A] placeholder:text-[#B0B0B0] outline-none border transition-all duration-200 focus:border-[#67B76D] focus:shadow-[0_4px_10px_rgba(103,183,109,0.35)] ${error ? 'border-[#E05A5A]' : 'border-transparent'
        }`;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');

        if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('Заполните все поля формы.');
            return;
        }

        if (password.length < 8) {
            setError('Пароль должен содержать минимум 8 символов.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают');
            return;
        }

        setIsSubmitting(true);
        try {
            await register({ email, password });
            navigate('/profile');
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
            <form onSubmit={handleSubmit} noValidate className="space-y-4 md:space-y-5">
                <div className="min-h-[44px] md:min-h-[48px]">
                    {error ? (
                        <p className="w-full max-w-[420px] mx-auto rounded-[12px] bg-[#EFC0C0] border border-[#D77D7D] text-[#8E5252] text-[16px] md:text-[18px] leading-tight text-center px-4 py-2.5">
                            {error}
                        </p>
                    ) : null}
                </div>

                <input
                    type="email"
                    placeholder="Введите e-mail"
                    value={email}
                    onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError('');
                    }}
                    className={inputClassName}
                />

                <input
                    type="password"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError('');
                    }}
                    className={inputClassName}
                />

                <input
                    type="password"
                    placeholder="Повторите пароль"
                    value={confirmPassword}
                    onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        if (error) setError('');
                    }}
                    className={inputClassName}
                />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full max-w-[320px] md:max-w-[340px] h-12 md:h-[54px] rounded-full bg-[#58B079] text-white text-[20px] md:text-[26px] leading-none mx-auto block hover:opacity-90 transition-opacity disabled:opacity-60"
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