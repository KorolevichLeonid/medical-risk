import React from 'react';
import { Link } from 'react-router-dom';

export default function MainLayout({ children }) {
  return (
    <div className="app-layout">
      <nav>
        <Link to="/">Главная</Link>
        <Link to="/auth">Авторизация</Link>
      </nav>
      <main>{children}</main>
    </div>
  );
}