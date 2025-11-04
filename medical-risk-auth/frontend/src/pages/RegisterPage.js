import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AuthPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'doctor'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      setIsLoading(false);
      return;
    }

    try {
      // Real API call to backend
      const response = await fetch('http://localhost:8000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role
        })
      });

      if (response.ok) {
        // User created successfully but needs activation
        alert('✅ Регистрация успешна!\n\nВаш аккаунт создан, но требует активации администратором.\nПосле активации вы сможете войти в систему.');
        navigate('/login');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Ошибка регистрации');
      }
    } catch (err) {
      setError('Ошибка соединения. Проверьте, запущен ли сервер.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-form-section">
          <div className="auth-form">
            <div className="auth-header">
              <Link to="/" className="back-link">← На главную</Link>
              <h1>Регистрация</h1>
              <p>Создайте аккаунт для управления рисками медицинских устройств.</p>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">Имя</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Введите ваше имя"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Фамилия</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Введите вашу фамилию"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email адрес</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Введите ваш email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Роль в системе</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="doctor">Доктор - проведение анализа рисков</option>
                  <option value="manager">Менеджер - управление проектами и командой</option>
                  <option value="admin">Администратор - управление проектами и пользователями</option>
                  <option value="sys_admin">Системный администратор - полный доступ к системе</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Пароль</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Введите пароль"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Подтвердите пароль</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Подтвердите пароль"
                    required
                  />
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" required />
                  <span>Я согласен с условиями использования и политикой конфиденциальности</span>
                </label>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Создание аккаунта...' : 'Зарегистрироваться'}
              </button>

              <div className="auth-footer">
                <p>
                  Уже есть аккаунт? 
                  <Link to="/login" className="auth-link"> Войти</Link>
                </p>
              </div>
            </form>
          </div>
        </div>

        <div className="auth-image-section">
          <div className="auth-image">
            <div className="image-content">
              <h3>Присоединяйтесь к нашей платформе</h3>
              <p>Начните свой путь анализа рисков медицинских устройств</p>
              <div className="features-list">
                <div className="feature-item">✓ Профессиональные инструменты</div>
                <div className="feature-item">✓ Командное сотрудничество</div>
                <div className="feature-item">✓ Соответствие стандартам</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
