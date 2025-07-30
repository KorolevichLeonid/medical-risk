import { Outlet, Link } from 'react-router-dom';
import { useMsal} from '@azure/msal-react';
import './Layout.css';

export default function Layout() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const handleLogin = () => {
    instance.loginRedirect();
  };

  return (
    <div className="app-layout">
      <header className="header">
        <div className="container">
          <div className="logo">
            <Link to="/">
              <img src={require('../assets/figma/image2.png')} alt="Figma visual" />
            </Link>
          </div>
          <nav className="nav-menu">
            <Link to="/" className="nav-link">Главная</Link>
            <Link to="/" className="nav-link">Защищённая</Link>
            <Link to="/" className="nav-link">О нас</Link>
            <Link to="/" className="nav-link">Контакты</Link>
            <Link to="/" className="nav-link">Администрация</Link>
          </nav>
          <div className="header-actions">
            {account ? (
              <>
                <Link to="/protected" className="btn-secondary">Личный кабинет</Link>
                <button onClick={() => instance.logoutRedirect()} className="btn-secondary">
                  Выйти
                </button>
              </>
            ) : (
              <button onClick={handleLogin} className="btn-secondary">
                Войти
              </button>
            )}
            <span className="support">Support</span>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}