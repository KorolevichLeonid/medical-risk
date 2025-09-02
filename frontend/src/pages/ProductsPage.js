import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as Logo } from '../logo.svg';
import './ProductsPage.css';

const ProductsPage = () => {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    setIsAnimated(true);
  }, []);

  return (
    <div className="products-page">
      {/* Header */}
      <div className="products-header">
        <div className="header-content">
          <div className="header-logo">
            <div className="logo-box">
              <Logo />
            </div>
            <span className="logo-text">SCICYBERLAB</span>
          </div>
         
            
        </div>
      </div>

      {/* Main Content */}
      <div className="products-main">
        <div className={`products-title-section ${isAnimated ? 'animate' : ''}`}>
          <h1 className="products-title">Buy a subscription</h1>
          <p className="products-subtitle">suggested options.</p>
        </div>

        <div className={`products-cards ${isAnimated ? 'animate' : ''}`}>
          {/* Standard Card */}
          <div className="product-card">
            <div className="card-header">
              <div className="card-logo">
                <div className="logo-box">
                  <Logo />
                </div>
                <span className="logo-text">SCICYBERLAB</span>
              </div>
              <h2 className="card-title">Standard</h2>
            </div>
            
            <div className="card-description">
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>

            <div className="card-features">
              <div className="feature-item">
                <div className="feature-bullet green"></div>
                <span>Lorem ipsum dolor</span>
              </div>
              <div className="feature-item">
                <div className="feature-bullet green"></div>
                <span>Lorem ipsum dolor</span>
              </div>
              <div className="feature-item">
                <div className="feature-bullet red"></div>
                <span>Lorem ipsum dolor</span>
              </div>
              <div className="feature-item">
                <div className="feature-bullet red"></div>
                <span>Lorem ipsum dolor</span>
              </div>
            </div>

            <div className="card-divider"></div>

            <div className="card-pricing">
              <div className="price">120$ / 6 months</div>
              <div className="price-note">first month free</div>
            </div>

            <button className="card-button">Buy now</button>
          </div>

          {/* Premium Card */}
          <div className="product-card">
            <div className="card-header">
              <div className="card-logo">
                <div className="logo-box">
                  <Logo />
                </div>
                <span className="logo-text">SCICYBERLAB</span>
              </div>
              <h2 className="card-title">Premium</h2>
            </div>
            
            <div className="card-description">
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            </div>

            <div className="card-features">
              <div className="feature-item">
                <div className="feature-bullet green"></div>
                <span>Lorem ipsum dolor</span>
              </div>
              <div className="feature-item">
                <div className="feature-bullet green"></div>
                <span>Lorem ipsum dolor</span>
              </div>
              <div className="feature-item">
                <div className="feature-bullet green"></div>
                <span>Lorem ipsum dolor</span>
              </div>
              <div className="feature-item">
                <div className="feature-bullet green"></div>
                <span>Lorem ipsum dolor</span>
              </div>
            </div>

            <div className="card-divider"></div>

            <div className="card-pricing">
              <div className="price">150$ / 6 months</div>
              <div className="price-note">first month free</div>
            </div>

            <button className="card-button">Buy now</button>
          </div>
        </div>
      </div>

      {/* Floating Support */}
      <div className="floating-support">
        <div className="floating-support-icon">💬</div>
      </div>
    </div>
  );
};

export default ProductsPage;
