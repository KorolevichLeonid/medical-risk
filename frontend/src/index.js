import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Очистка содержимого перед рендерингом
const container = document.getElementById('root');
container.innerHTML = ''; // Критически важная строка

const root = ReactDOM.createRoot(container);
root.render(<App />);