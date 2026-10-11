import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(Boolean);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center text-xs md:text-sm text-slate-500 mb-4 select-none" aria-label="Breadcrumb">
      <ol className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 shadow-xs">
        <li className="inline-flex items-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-[var(--color-vnpost-blue)] transition-colors rounded-lg p-1 hover:bg-white/80"
            title="Trang chủ"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trang chủ</span>
          </Link>
        </li>

        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          const title = value.charAt(0).toUpperCase() + value.slice(1);

          return (
            <li key={to} className="inline-flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-slate-900 px-1 py-0.5" aria-current="page">
                  {title}
                </span>
              ) : (
                <Link 
                  to={to} 
                  className="font-medium text-slate-600 hover:text-[var(--color-vnpost-blue)] transition-colors px-1 py-0.5 rounded-md hover:bg-white/80"
                >
                  {title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
