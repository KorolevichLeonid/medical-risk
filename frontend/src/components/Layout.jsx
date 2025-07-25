import { Link } from 'react-router-dom';

export default function Layout({ children }) {
  return (
    <div>
      <header>
        <nav>
          <Link to="/">Главная</Link> | 
          <Link to="/about">О нас</Link> | 
          <Link to="/contact">Контакты</Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer>© 2023 MedicalRisk</footer>
    </div>
  );
}