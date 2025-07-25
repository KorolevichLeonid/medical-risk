import React, { useState } from 'react';
import AuthForm from '../components/AuthForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-page">
      <AuthForm isLogin={isLogin} toggleMode={() => setIsLogin(!isLogin)} />
    </div>
  );
}