import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, User, ChevronDown } from 'lucide-react';

const ProductsPage = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const plans = [
    {
      name: 'Trial',
      description: 'For anyone exploring the platform - a free 3-day version with essential features to evaluate core capabilities before committing.',
      price: '0',
      buttons: [{ label: 'Join for free', primary: true }],
      trialNote: null,
      features: [],
    },
    {
      name: 'Basic',
      description: 'For startups and small manufacturers at the beginning of their growth journey.',
      price: '249',
      buttons: [{ label: 'Join with Basic', primary: true }],
      trialNote: 'Free 3-day trial',
      features: ['Up to 3 projects', 'Up to 5 users', 'Core features', 'Email support (response within 48h)'],
    },
    {
      name: 'Standard',
      description: 'For small and medium-sized enterprises seeking reliable tools to support steady operational growth.',
      price: '499',
      buttons: [{ label: 'Join with Standard', primary: true }],
      trialNote: 'Free 3-day trial',
      features: ['Up to 8 projects', 'Up to 10 users', 'Extended features', 'Email support (response within 48h)'],
    },
    {
      name: 'Professional',
      description: 'For companies with a broad portfolio of medical products requiring advanced control over documentation, compliance, and production workflows.',
      price: '799',
      buttons: [
        { label: 'Start a free trial', primary: false },
        { label: 'Contact sales', primary: true },
      ],
      trialNote: null,
      features: ['Up to 15 projects', 'Up to 15 users', 'Premium features', 'In-app chat support (12\u201324h)'],
    },
    {
      name: 'Enterprise',
      description: 'For global manufacturers operating across multiple sites and markets, with a need for scalable solutions and seamless integration with corporate systems.',
      price: '1299',
      buttons: [
        { label: 'Start a free trial', primary: false },
        { label: 'Contact sales', primary: true },
      ],
      trialNote: null,
      features: ['Up to 25 projects', 'Up to 25 users', 'Premium features', 'In-app chat support (12\u201324h)'],
    },
  ];

  return (
    <div className="min-h-screen font-sans text-black pb-20" style={{ background: 'linear-gradient(116.82deg, #E6F7FA 0%, #EAEAEA 100%)' }}>
      {/* Header */}
      <header className="max-w-[1440px] mx-auto pt-[40px] md:pt-[90px] px-8 md:px-[80px] flex flex-wrap justify-between items-center gap-6">
        <nav className="flex gap-6 md:gap-10 text-base">
          <Link to="/products" className="hover:opacity-70 transition-opacity">Pricing</Link>
          <Link to="/" className="hover:opacity-70 transition-opacity">Partners</Link>
          <Link to="/" className="hover:opacity-70 transition-opacity">Contacts</Link>
        </nav>

        <div className="flex items-center gap-6 md:gap-8">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity">
            <Globe className="w-6 h-6 text-[#0CC0DF]" />
            <span>English</span>
            <ChevronDown className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {user ? (
              <Link to="/account" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                <User className="w-6 h-6 text-[#0CC0DF]" />
                <span>{user.first_name} {user.last_name}</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <User className="w-6 h-6 text-[#0CC0DF]" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
                <Link to="/login" className="px-4 md:px-5 py-1.5 md:py-2 border-[3px] border-[#AED486] rounded-xl hover:bg-[#AED486] hover:text-white transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-[1300px] mx-auto mt-16 md:mt-24 flex flex-col items-center text-center px-4">
        {/* Logo */}
        <div className="relative inline-block mb-8">
          <h1 className="text-4xl md:text-[42px] font-raleway font-bold tracking-widest uppercase pb-2" style={{ background: 'linear-gradient(90deg, #0CC0DF -0.41%, #FFDE59 100.42%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SCICYBER LAB
          </h1>
          <div className="absolute bottom-0 right-0 w-[94px] h-0 border-[3px] border-[#10C1DD]"></div>
        </div>

        <h2 className="font-raleway font-bold text-4xl md:text-[64px] leading-tight md:leading-[62px] max-w-[1118px] mb-8">
          SciCyberLab - the home for those who choose security and simplicity
        </h2>

        <p className="font-light text-sm md:text-base leading-relaxed md:leading-6 max-w-[857px] mb-10">
          Risk analysis doesn't have to be complicated. Our tool guides you step by step - helping you build your team, input the right data, and generate documentation that complies with ISO 14971, MDR, FDA, and other international standards.{' '}
          <br className="hidden md:block" />
          <Link to="/login" className="text-[#0CC0DF] hover:underline font-normal">Join us and simplify the process.</Link>
        </p>

        <Link to="/login" className="bg-[#AED486] text-white px-8 py-3 rounded-xl text-base hover:opacity-90 transition-opacity mb-20 shadow-sm no-underline">
          Enjoy a free 3-day trial
        </Link>

        {/* Pricing Cards */}
        <div className="flex justify-center gap-4 lg:gap-6 w-full mb-12 flex-wrap xl:flex-nowrap px-4">
          {plans.map((plan) => (
            <div key={plan.name} className="bg-[#F2E6A2] rounded-[10px] pt-10 pb-8 px-4 w-[236px] min-w-[236px] h-[422px] flex flex-col items-center text-center shadow-sm shrink-0 snap-center">
              <h3 className="font-raleway font-medium text-xl mb-4">{plan.name}</h3>
              <p className="text-[10px] leading-[14px] text-[#505050] mb-6 min-h-[56px]" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                {plan.description}
              </p>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-raleway font-medium text-[34px]">{plan.price}</span>
                <span className="font-raleway font-medium text-[15px]">usd/month</span>
              </div>

              {plan.buttons.length === 1 ? (
                <button
                  className="w-[186px] h-[40px] bg-transparent rounded-[10px] text-xs mb-2 flex items-center justify-center"
                  style={{ border: '5px solid #FDFAF6', fontFamily: "'Open Sans', sans-serif" }}
                >
                  {plan.buttons[0].label}
                </button>
              ) : (
                <div className="flex justify-between gap-[5px] w-full mb-2">
                  {plan.buttons.map((btn, i) => (
                    <button
                      key={i}
                      className="flex-1 h-[40px] rounded-[10px] text-xs flex items-center justify-center px-1"
                      style={{
                        border: btn.primary ? '5px solid #AED486' : '5px solid #FDFAF6',
                        background: btn.primary ? '#FDFAF6' : 'transparent',
                        fontFamily: "'Open Sans', sans-serif",
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {plan.trialNote && (
                <p className="text-[10px] text-[#505050] mb-4" style={{ fontFamily: "'Open Sans', sans-serif" }}>{plan.trialNote}</p>
              )}

              {plan.features.length > 0 && (
                <ul className="text-xs leading-[22px] text-left w-full list-disc pl-4 marker:text-gray-500 mt-auto" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                  {plan.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <p className="font-light text-base mb-12 text-[#000000]">Prices exclude any applicable taxes.</p>

        <h2 className="font-raleway font-bold text-5xl md:text-[64px] leading-[62px] mb-16">Add-ons</h2>

        <div className="flex flex-col items-center gap-2 cursor-pointer hover:opacity-70 group">
          <span className="text-base text-[#000000]">Compare all features</span>
          <ChevronDown className="w-6 h-6 text-[#6E6E6E] group-hover:translate-y-1 transition-transform" />
        </div>
      </main>
    </div>
  );
};

export default ProductsPage;
