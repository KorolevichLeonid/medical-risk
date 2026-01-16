import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { ReactComponent as Logo } from '../logo.svg';
import './HomePage.css';

const HomePage = () => {
  const [showReturn, setShowReturn] = useState(false);
  const [showSignin, setShowSignin] = useState(true);
  const [secondScreenAnimated, setSecondScreenAnimated] = useState(false);
  const [firstScreenAnimated, setFirstScreenAnimated] = useState(false);
  const [firstScreenVisible, setFirstScreenVisible] = useState(true);
  const [secondScreenVisible, setSecondScreenVisible] = useState(false);
  const [user, setUser] = useState(null);
  const { instance } = useMsal();

  useEffect(() => {
    // Загружаем данные пользователя из localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }

    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      setShowReturn(scrollTop > 100);

      // Проверяем, близко ли к нижнему краю страницы
      const isNearBottom = scrollTop + window.innerHeight >= document.body.scrollHeight - 100;
      setShowSignin(!isNearBottom);

      // Проверяем видимость первого экрана
      const firstScreen = document.querySelector('.first-screen');
      if (firstScreen) {
        const rect = firstScreen.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        setFirstScreenVisible(isVisible);
        setFirstScreenAnimated(isVisible);
      }

      // Проверяем видимость второго экрана
      const secondScreen = document.querySelector('.second-screen');
      if (secondScreen) {
        const rect = secondScreen.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        setSecondScreenVisible(isVisible);
        setSecondScreenAnimated(isVisible);
      }
    };

    // Запускаем анимацию первого экрана сразу
    setFirstScreenAnimated(true);
    setFirstScreenVisible(true);
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="home-page">
      {/* Первый экран */}
      <div className="first-screen">
        {/* Верхняя навигация */}
        <div className="top-navigation">
          <div className="nav-left">
            <Link to="/products" className="nav-btn">Products</Link>
            <button className="nav-btn" onClick={() => document.querySelector('.second-screen').scrollIntoView({ behavior: 'smooth' })}>About us</button>
            <button className="nav-btn" onClick={() => document.querySelector('.third-screen').scrollIntoView({ behavior: 'smooth' })}>Contacts</button>
          </div>
          <div className="nav-right">
            {user ? (
              <Link to="/account" className="nav-user-info">
                <div className="nav-user-avatar">
                  <span className="nav-user-icon">👤</span>
                </div>
                <div className="nav-user-details">
                  <span className="nav-user-name">{user.first_name} {user.last_name}</span>
                  <span className="nav-user-status">✓ Signed in</span>
                </div>
              </Link>
            ) : (
              <div className="nav-auth-section">
                <div className="nav-account-icon">
                  <span className="nav-account-symbol">👤</span>
                </div>
                <Link to="/login" className="nav-auth-btn nav-signin">Sign In</Link>
              </div>
            )}
          </div>
        </div>

        <div className="home-container">
          <div className="home-content">
            <div className="logo-section">
              <div className="logo">
                <div className="logo-box">
                  <Logo />
                </div>
                <span className="logo-text">SCICYBERLAB</span>
              </div>
            </div>

            <div className={`main-content ${firstScreenAnimated ? 'animate' : ''}`}>
              <h2 className="main-title">
                Risk analysis<br />
                for<br />
                medical devices
              </h2>

              <p className="main-description">
                SciCyberLab Standardization FZ-LLC - employs professionals with extensive experience in international standardization and certification, including ISO standards.<br /><br />
                We work in accordance with the most popular international standards in such industries as medicine, food safety, health, ecology, pharmaceuticals, information technology and artificial intelligence.<br /><br />
                The key advantage of our company is auditors who have conducted inspections of enterprises around the world. Their practical experience allows us not only to consult, but to ensure the real readiness of organizations for international inspections and certification in terms of risk assessment.<br /><br />
                Based on many years of experience, we have come to the conclusion that most manufacturers of medical devices face serious difficulties in assessing risks and hazards, especially at the design and launch stages of products on the market. Additional difficulties are created by the legislative requirements of the EU, USA and CIS countries - especially in terms of compliance with ISO 14971, MDR, FDA and other regulatory documents.
              </p>
            </div>


          </div>

          <div className="home-image">
            <div className={`image-shapes ${firstScreenAnimated ? 'animate' : ''}`}>
              <div className="image-shape image-shape-1">
                <div className="corner corner-top-left"></div>
                <div className="corner corner-bottom-right"></div>
              </div>
              <div className="image-shape image-shape-2">
                <div className="corner corner-top-left"></div>
                <div className="corner corner-bottom-right"></div>
              </div>
            </div>
            <div className={`image-text ${firstScreenAnimated ? 'animate' : ''}`}>
              <p>
                To simplify the risk assessment process, structure the work in this area and ensure compliance with international requirements, we have developed specialized software. It allows you to significantly simplify risk analysis, takes into account current regulatory requirements and generates final documents that fully comply with ISO 14971, MDR, FDA and other applicable international standards.<br /><br />
                Our mission is to systematically enhance the quality and safety of our clients' products - making the process accessible, transparent, and technologically advanced.<br /><br />
                Try our application with a free 3-day version and see how much easier your work can be when assessing risks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Второй экран */}
      <div className="second-screen">
        <div className="second-screen-container">
          <div className={`why-us-content ${secondScreenAnimated ? 'animate' : ''}`}>
            <h2 className="why-us-title">Why Us?</h2>
            <p className="why-us-text">
              Not sure where to begin with risk analysis? Worried about getting lost in regulatory requirements? Our tool guides you step by step - helping you form the right team, assign roles, input the necessary data, and generate documentation that fully complies with ISO 14971, MDR, FDA, and other relevant standards.
              <br /><br />
              Join the platform already trusted by medical device manufacturers around the world - and simplify risk analysis from product concept to market launch. Risk analysis doesn’t have to be complicated. Our tool guides you step by step - helping you build your team, input the right data, and generate documentation that complies with ISO 14971, MDR, FDA, and other international standards. Join us and simplify the process.
            </p>
          </div>

          <div className={`why-us-cards ${secondScreenAnimated ? 'animate' : ''}`}>
            <div className="why-us-card"></div>
            <div className="why-us-card"></div>
            <div className="why-us-card"></div>
          </div>
        </div>
      </div>

      {/* Третий экран */}
      <div className="third-screen">
      </div>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <p>&copy; 2025 SciCyberLab Standardization FZ-LLC</p>
          <p>CWEP0774, Compass Building, Al Shohada Road, AL Hamra Industrial Zone-FZ, Ras Al Khaimah, United Arab Emirates</p>
          <p>info@scicyberlab.com</p>
        </div>
      </footer>

      {/* Плавающие элементы */}

      <button 
        className={`home-floating-return ${showReturn ? 'visible' : ''}`}
        onClick={scrollToTop}
      >
        ↑
      </button>

      <Link
        to="/login"
        className={`floating-signin ${showSignin ? 'visible' : ''}`}
      >
        Sign In
      </Link>
    </div>
  );
};

export default HomePage;
