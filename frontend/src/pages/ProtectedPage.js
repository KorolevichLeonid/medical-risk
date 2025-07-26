import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function ProtectedPage() {
  const { accounts } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!accounts || accounts.length === 0) {
      navigate('/auth');
    }
  }, [accounts, navigate]);

  if (!accounts || accounts.length === 0) return null;

  const account = accounts[0];

  return (
    <div>
      <h1>Защищённая страница</h1>
      <p>Добро пожаловать, {account.name}</p>
      <p>Почта: {account.username}</p>
    </div>
  );
}