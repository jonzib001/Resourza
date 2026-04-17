import React from 'react';
import brandLogo from "../assets/icon.jpeg"

const NavIcon = ({ children }) => (
  <div className="p-2 rounded-full text-gray-500 hover:text-secondary-slate cursor-pointer transition-colors">
    {children}
  </div>
);

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-gray-100 px-10 py-4 flex items-center justify-between shadow-sm">
      
      {/* 1. LEFT SIDE: LOGO */}
      <div className="flex items-center gap-3">
        <img 
          src={brandLogo} 
          alt="Resourza Logo" 
          className="w-9 h-9 object-contain" 
        />
        <span className="text-xl font-bold text-secondary-slate font-manrope">Resourza</span>
      </div>

      {/* 2. RIGHT SIDE: LINKS & ICONS GROUPED TOGETHER */}
      <div className="flex items-center gap-8">
        
        {/* MENU LINKS */}
        <div className="flex items-center gap-6">
          {["Contact Us", "Make a Request"].map(item => (
            <a key={item} href="#" className="text-sm font-medium text-gray-600 hover:text-primary-academic font-manrope transition">
              {item}
            </a>
          ))}
        </div>

        {/* ICONS */}
        <div className="flex items-center gap-2">
          {/* Bell Icon Placeholder */}
          <NavIcon>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
          </NavIcon>
          {/* Profile Icon Placeholder */}
          <NavIcon>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          </NavIcon>
        </div>
        
      </div>
    </nav>
  );
}