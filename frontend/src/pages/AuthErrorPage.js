import { useNavigate } from 'react-router-dom';

export default function AuthErrorPage() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Ошибка авторизации</h1>
      <p>Что-то пошло не так во время входа.</p>
      <button onClick={() => navigate('/auth')}>Попробовать снова</button>
    </div>
  );
}