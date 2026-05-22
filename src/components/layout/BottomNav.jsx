import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const BottomNav = ({ onAddClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: 'restaurant', label: 'Cucina', path: '/' },
    { icon: 'home', label: 'Casa', path: '/household' },
  ];

  const rightItems = [
    { icon: 'inventory_2', label: 'Dispensa', path: '/pantry' },
    { icon: 'storefront', label: 'Negozi', path: '/stores' },
  ];

  const handleNavClick = (e, path, isActive) => {
    if (isActive) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderNavItem = (item) => (
    <NavLink
      key={item.path}
      to={item.path}
      onClick={(e) => handleNavClick(e, item.path, location.pathname === item.path)}
      className={({ isActive }) => `
        flex flex-1 flex-col items-center gap-2 group transition-all py-1
        ${isActive ? 'text-slate-900' : 'text-slate-400'}
      `}
    >
      {({ isActive }) => (
        <>
          <div className={`
            flex items-center justify-center size-10 rounded-2xl transition-all
            ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-110' : 'group-hover:bg-slate-50'}
          `}>
            <span
              className="material-symbols-outlined !text-2xl transition-all"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
          </div>
          <span className={`text-[11px] uppercase tracking-wider transition-all text-center leading-none ${isActive ? 'font-black opacity-100' : 'font-bold opacity-80'}`}>
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 pb-2 pt-2 z-50 shadow-[0_-3px_12px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map(renderNavItem)}

        {/* Central Add Button */}
        <div className="flex flex-1 justify-center -mt-8">
          <button
            onClick={onAddClick}
            className="size-16 rounded-full bg-primary text-white flex items-center justify-center transform active:scale-95 transition-all hover:scale-105 border-4 border-white"
          >
            <span className="material-symbols-outlined !text-4xl">add</span>
          </button>
        </div>

        {rightItems.map(renderNavItem)}
      </div>
    </nav>
  );
};

export default BottomNav;
