import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import './SupportButton.css';

const SupportButton = () => {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [user, setUser] = useState(null);
  const { instance } = useMsal();

  useEffect(() => {
    // Загружаем данные пользователя из localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setSupportEmail(parsedUser.email || '');
    }
  }, []);

  const handleSupportClick = () => {
    setIsSupportModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsSupportModalOpen(false);
    setSupportMessage('');
    // Сбрасываем email только если пользователь не авторизован
    if (!user) {
      setSupportEmail('');
    }
  };

  const handleSubmitSupport = (e) => {
    e.preventDefault();
    // Здесь можно добавить логику отправки сообщения
    console.log('Support message:', supportMessage);
    console.log('Support email:', supportEmail);
    handleCloseModal();
  };

  return (
    <>
      {/* Floating Support Button */}
      <div className="floating-support" onClick={handleSupportClick}>
        <div className="floating-support-icon">💬</div>
      </div>

      {/* Support Modal */}
      {isSupportModalOpen && (
        <div className="support-modal-overlay" onClick={handleCloseModal}>
          <div className="support-modal" onClick={(e) => e.stopPropagation()}>
            <div className="support-modal-header">
              <h3>Связаться с поддержкой</h3>
              <button className="support-modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmitSupport} className="support-modal-form">
              <div className="support-modal-content">
                {user ? (
                  <div className="support-user-section">
                    <div className="support-user-info">
                      <div className="support-user-avatar">
                        <span className="support-user-icon">👤</span>
                      </div>
                      <div className="support-user-details">
                        <span className="support-user-name">{user.first_name} {user.last_name}</span>
                      </div>
                    </div>
                    <div className="support-notification-note">
                      <span className="support-note-icon">📬</span>
                      <span className="support-note-text">Ответ придет в виде уведомления в личном кабинете</span>
                    </div>
                  </div>
                ) : (
                  <div className="support-email-field">
                    <label htmlFor="support-email">Email для ответа:</label>
                    <input
                      id="support-email"
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="Введите ваш email адрес"
                      className="support-email-input"
                      required
                    />
                  </div>
                )}
                
                <div className="support-message-field">
                  <label htmlFor="support-message">Опишите вашу проблему или вопрос:</label>
                  <textarea
                    id="support-message"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Введите ваше сообщение здесь..."
                    className="support-textarea"
                    rows="4"
                    required
                  />
                </div>
              </div>
              <div className="support-modal-footer">
                <button type="button" className="support-cancel-btn" onClick={handleCloseModal}>
                  Отмена
                </button>
                <button type="submit" className="support-submit-btn">
                  Отправить сообщение
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportButton;
