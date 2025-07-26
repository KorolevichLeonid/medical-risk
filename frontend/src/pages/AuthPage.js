import { useMsal } from '@azure/msal-react';

export default function AuthPage() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect({
      scopes: ["openid", "profile", "email"]
    }).catch(error => {
      console.error("Login failed:", error);
      window.location.href = '/auth-error';
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={handleLogin}>Войти через Microsoft</button>
    </div>
  );
}