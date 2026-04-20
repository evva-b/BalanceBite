import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import logo from '../../assets/logo.svg';

type AuthLayoutProps = {
  title: string;
  children: ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkTo: string;
};

export function AuthLayout({
  title,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className="h-screen bg-[#F7F7DD] flex flex-col items-center px-4 py-4 sm:px-6 md:py-6 overflow-hidden">
      <Link to="/" className="mb-5 md:mb-6 shrink-0">
        <img src={logo} alt="BalanceBite" className="w-[210px] sm:w-[250px] md:w-[300px] max-w-full h-auto" />
      </Link>

      <section className="w-full max-w-[620px] rounded-[26px] md:rounded-[36px] bg-white pt-6 pb-5 px-5 sm:px-7 md:px-10 md:pt-7 md:pb-6 shadow-sm">
        <h1 className="text-center text-[#8CDF75] text-[30px] sm:text-[32px] md:text-[38px] leading-none font-semibold mb-6 md:mb-7">
          {title}
        </h1>
        {children}

        <div className="w-full h-px bg-[#B5B5B5] mt-6 md:mt-7 mb-4" />
        <p className="text-[18px] md:text-[20px] leading-none text-[#808080] flex items-center justify-between gap-4">
          <span>{footerText}</span>
          <Link to={footerLinkTo} className="text-[#222] font-semibold hover:opacity-80 transition-opacity">
            {footerLinkText}
          </Link>
        </p>
      </section>
    </div>
  );
}
