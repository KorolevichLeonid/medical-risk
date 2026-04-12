import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Globe, User, ChevronDown, ArrowUp } from 'lucide-react';
import logoImg from '../assets/logomax.svg';
import illustrationImg from '../assets/act.svg';
import SupportButton from '../components/SupportButton';

const Logo = () => (
  <img src={logoImg} alt="SCICYBER LAB" className="h-[44px] w-auto" />
);

const HomePage = () => {
  const [user, setUser] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { instance } = useMsal();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FBFF] to-[#EAEAEA] overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-[1440px] mx-auto px-10 lg:px-20 pt-8 pb-4 flex justify-between items-center z-50 relative">
        <nav className="hidden md:flex items-center gap-8 text-base">
          <Link to="/products" className="hover:text-[#10C1DD] transition-colors">Pricing</Link>
          <a href="#about" className="hover:text-[#10C1DD] transition-colors">Partners</a>
          <a href="#footer" className="hover:text-[#10C1DD] transition-colors">Contacts</a>
        </nav>
        <div className="flex items-center gap-8">
          <button className="hidden md:flex items-center gap-2 text-[#0CC0DF] hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5" />
            <span className="text-black">English</span>
            <ChevronDown className="w-4 h-4 text-black" />
          </button>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/account" className="flex items-center gap-2 hover:text-[#10C1DD] transition-colors">
                <User className="w-5 h-5 text-[#0CC0DF]" />
                <span>{user.first_name} {user.last_name}</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="flex items-center gap-2 hover:text-[#10C1DD] transition-colors">
                  <User className="w-5 h-5 text-[#0CC0DF]" />
                  <span>Sign in</span>
                </Link>
                <Link to="/login" className="border-2 border-[#AED486] rounded-xl px-6 py-2 hover:bg-[#AED486] hover:text-white transition-colors">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Logo below header */}
      <div className="w-full max-w-[1440px] mx-auto px-10 lg:px-20 pt-2 pb-8">
        <Logo />
      </div>

      <main>
        {/* Hero Section */}
        <section className="w-full max-w-[1440px] mx-auto px-10 lg:px-20 pt-16 pb-32 relative">
          <h1 className="font-raleway font-bold text-[56px] lg:text-[68px] leading-[1.1] mb-12 text-black max-w-[700px]">
            Risk analysis<br />for medical devices
          </h1>

          <div className="flex flex-col lg:flex-row relative">
            <div className="w-full lg:w-1/2 z-10">
              <div className="text-black text-base leading-[1.6] space-y-6 max-w-[640px] font-light">
                <p>
                  <span className="font-semibold text-[#1DC2D6]">SciCyberLab Standardization FZ-LLC</span> - employs professionals with extensive experience in international standardization and certification, including ISO standards.
                </p>
                <p>
                  We work in accordance with the most popular international standards in such industries as medicine, food safety, health, ecology, pharmaceuticals, information technology and artificial intelligence.
                </p>
                <p>
                  The key advantage of our company is auditors who have conducted inspections of enterprises around the world. Their practical experience allows us not only to consult, but to ensure the real readiness of organizations for international inspections and certification in terms of risk assessment.
                </p>
                <p>
                  Based on many years of experience, we have come to the conclusion that most manufacturers of medical devices face serious difficulties in assessing risks and hazards, especially at the design and launch stages of products on the market. Additional difficulties are created by the legislative requirements of the EU, USA and CIS countries - especially in terms of compliance with ISO 14971, MDR, FDA and other regulatory documents.
                </p>
                <p>
                  To simplify the risk assessment process, structure the work in this area and ensure compliance with international requirements, we have developed specialized software. It allows you to significantly simplify risk analysis, takes into account current regulatory requirements and generates final documents that fully comply with ISO 14971, MDR, FDA and other applicable international standards.
                </p>
                <p className="font-medium text-[#1DC2D6]">
                  Our mission is to systematically enhance the quality and safety of our clients' products - making the process accessible, transparent, and technologically advanced.
                </p>
              </div>

              <p className="text-lg mt-12 text-black">
                Try our application with a <Link to="/login" className="text-[#1DC2D6] underline hover:no-underline">free 3-day trial</Link> and see how much easier your work can become.
              </p>
            </div>

            {/* Hero Right Side - Abstract Shapes */}
            <div className="hidden lg:block w-1/2 relative min-h-[600px]">
              <div className="absolute top-0 right-20 w-[535px] h-[318px] bg-[#D0CDCD] rounded-tl-none rounded-tr-[50px] rounded-br-[50px] rounded-bl-[50px] shadow-lg z-10"></div>
              <div className="absolute top-[174px] right-0 w-[380px] h-[237px] bg-[#DFDDDD] rounded-tl-none rounded-tr-[50px] rounded-br-[50px] rounded-bl-[50px] shadow-xl z-20"></div>
            </div>
          </div>
        </section>

        {/* Feature Section */}
        <section id="about" className="w-full max-w-[1440px] mx-auto px-10 lg:px-20 py-32 flex flex-col items-center">
          <div className="w-full max-w-[1118px] mb-16 flex justify-center items-center">
            <img src={illustrationImg} alt="Medical risk analysis illustration" className="w-full max-w-[900px] h-auto" />
          </div>

          <h2 className="font-raleway font-bold text-[40px] md:text-[56px] lg:text-[64px] leading-[1.1] text-center mb-8 max-w-[1200px]">
            SciCyberLab - the home for those <br className="hidden lg:block" /> who choose security and simplicity
          </h2>

          <div className="text-center max-w-[824px] mb-16 text-base leading-relaxed font-light flex flex-col gap-4">
            <p className="text-[#1DC2D6]">
              Not sure where to begin with risk analysis? Worried about getting lost in regulatory requirements?
            </p>
            <p className="text-black">
              Our tool guides you step by step - helping you form the right team, assign roles, input the necessary data, and generate documentation that fully complies with ISO 14971, MDR, FDA, and other relevant standards.
            </p>
            <p className="text-black">
              Join the platform already trusted by medical device manufacturers around the world - and simplify risk analysis from product concept to market launch.
            </p>
          </div>

          {/* CTA Form */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-5 w-full">
            <div className="bg-[#FDFAF6] rounded-[10px] h-[70px] w-full max-w-[514px] flex items-center justify-between pl-6 pr-[15px]">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-transparent outline-none text-black placeholder:text-black w-full text-[16px] font-sans border-none shadow-none"
              />
              <Link to="/login" className="bg-[#AED486] text-white rounded-[10px] h-[40px] w-[239px] flex-shrink-0 flex items-center justify-center hover:bg-[#9cc275] transition-colors font-sans text-[16px] no-underline">
                Sign up for SciCyberLab
              </Link>
            </div>

            <Link to="/login" className="border-[5px] border-[#FDFAF6] rounded-[10px] h-[50px] w-[186px] flex-shrink-0 flex items-center justify-center text-black hover:bg-[#FDFAF6]/50 transition-colors font-sans text-[16px] no-underline">
              Try free 3-day trial
            </Link>
          </div>
        </section>
      </main>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-white border border-[#6E6E6E]/30 rounded-full shadow-lg flex items-center justify-center hover:bg-[#F0FBFF] transition-colors"
        >
          <ArrowUp className="w-5 h-5 text-[#6E6E6E]" />
        </button>
      )}

      {/* Support button */}
      <SupportButton />

      {/* Footer */}
      <footer id="footer" className="w-full bg-[#F5F5F5] py-16 mt-10">
        <div className="max-w-[1440px] mx-auto px-10 lg:px-20 flex flex-col lg:flex-row justify-between items-start gap-10">
          <div className="flex flex-col gap-6 max-w-[400px]">
            <Logo />
            <div className="text-xs font-light text-gray-600 space-y-2">
              <p>&copy; 2025 SciCyberLab Standardization FZ-LLC</p>
              <p>CWEP0774, Compass Building, Al Shohada Road, AL Hamra Industrial Zone-FZ, Ras Al Khaimah, United Arab Emirates</p>
              <a href="mailto:info@scicyberlab.com" className="underline hover:text-[#10C1DD] transition-colors">info@scicyberlab.com</a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-10 lg:gap-20">
            <nav className="flex items-center gap-8 text-base">
              <Link to="/products" className="hover:text-[#10C1DD] transition-colors">Pricing</Link>
              <a href="#" className="hover:text-[#10C1DD] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#10C1DD] transition-colors">Privacy (Updated 09/25)</a>
            </nav>

            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-[#10C1DD] transition-colors">Sign in</Link>
              <Link to="/login" className="border-2 border-[#AED486] rounded-xl px-6 py-2 hover:bg-[#AED486] hover:text-white transition-colors">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
