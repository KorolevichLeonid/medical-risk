import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../logo.svg';
import './HomePage.css';

const HomePage = () => {
  const [showReturn, setShowReturn] = useState(false);
  const [secondScreenAnimated, setSecondScreenAnimated] = useState(false);
  const [firstScreenAnimated, setFirstScreenAnimated] = useState(false);
  const [firstScreenVisible, setFirstScreenVisible] = useState(true);
  const [secondScreenVisible, setSecondScreenVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      setShowReturn(scrollTop > 100);
      
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
            <button className="nav-btn">Contacts</button>
          </div>
          <div className="nav-right">
            <Link to="/login" className="nav-auth-btn nav-signin">Sign In</Link>
            <Link to="/register" className="nav-auth-btn nav-signup">Sign Up</Link>
          </div>
        </div>

        <div className="home-container">
          <div className="home-content">
            <div className="logo-section">
              <div className="logo">
                <div className="logo-icon">
                  <Logo />
                </div>
                <h1>Medical Risk Analysis</h1>
              </div>
            </div>

            <div className={`main-content ${firstScreenAnimated ? 'animate' : ''}`}>
              <h2 className="main-title">
                Lower Risk<br />
                For<br />
                Medical Products
              </h2>
              
              <p className="main-description">
                Lorem ipsum dolor sit amet consectetur. Semper urna ante et erat. Vulputate vel bibendum quisque libero eget. Pretium ipsum imperdiet sit proin metus. Ut ultrices at justo tincidunt purus elementum maecenas fermentum. Aliquam est feugiat egestas pellentesque. Malesuada facilisis ac nulla pulvinar quis leo magnis. Scelerisque massa nunc viverra accumsan nam.
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
          </div>
        </div>
      </div>

      {/* Второй экран */}
      <div className="second-screen">
        <div className="second-screen-container">
          <div className={`why-us-content ${secondScreenAnimated ? 'animate' : ''}`}>
            <h2 className="why-us-title">Why Us?</h2>
            <p className="why-us-text">
              Lorem ipsum dolor sit amet consectetur. Pellentesque aliquet etiam lacus natoque hendrerit eu. Massa consectetur amet commodo praesent massa. In ut vitae commodo venenatis rhoncus justo luctus bibendum nulla. Orci vel elit volutpat id mi ornare amet molestie quis. Integer tellus lectus tempor cras vestibulum congue. Sagittis tellus neque integer vel suspendisse urna egestas.
              <br /><br />
              Venenatis risus imperdiet nibh vitae at ultrices. Ornare vitae pellentesque egestas sed dictum dui sit lacinia. Massa tristique quis sagittis neque et. Laoreet donec id platea id massa adipiscing. Etiam nec eget lacus sed sagittis. Ipsum sapien tristique ipsum nec neque at integer donec.
              <br /><br />
              Tempor etiam a sodales enim maecenas ut. Et gravida habitant facilisis id facilisi nec sed faucibus massa. Faucibus vestibulum viverra nec tempus quam. Diam lobortis enim in condimentum ipsum. Vitae ultricies eu arcu donec fermentum enim. Velit volutpat diam viverra ac sed in felis arcu neque. Neque tellus dolor egestas non sed in. Lorem nam feugiat arcu amet. Donec at tempus in augue orci. Ut vitae nibh rhoncus turpis rhoncus pretium. Nunc elementum vulputate hendrerit egestas feugiat nisl. Sem ac feugiat felis elementum auctor scelerisque amet adipiscing. Metus maecenas pellentesque sed vulputate lectus tellus. Ultrices et libero scelerisque est tortor auctor amet leo eget. Vitae sed mattis ut volutpat odio eros potenti pulvinar.
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

      {/* Плавающие элементы */}
      <div className="floating-support">
        <div className="floating-support-icon">💬</div>
      </div>

      <button 
        className={`floating-return ${showReturn ? 'visible' : ''}`}
        onClick={scrollToTop}
      >
        ↑
      </button>

      <Link 
        to="/login" 
        className="floating-signin"
      >
        Sign In
      </Link>
    </div>
  );
};

export default HomePage;
