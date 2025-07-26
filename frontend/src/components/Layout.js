import { Outlet, Link } from 'react-router-dom';
import { useMsal} from '@azure/msal-react';

export default function Layout() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  return (
    <div>
      <nav>
        <Link to="/">Главная</Link>{" "}
        <Link to="/protected">Защищённая</Link>{" "}
        {account ? (
          <button onClick={() => instance.logoutRedirect()}>Выйти</button>
        ) : (
          <Link to="/auth">Войти</Link>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}