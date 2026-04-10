import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { Globe, User, ChevronDown } from 'lucide-react';

const Logo = () => (
  <div className="relative inline-flex font-raleway font-bold text-[32px] tracking-wide">
    <span className="bg-gradient-to-r from-[#0CC0DF] to-[#FFDE59] bg-clip-text text-transparent relative z-20">
      SCICYBER LAB
    </span>
    <div className="absolute inset-0 flex pointer-events-none" aria-hidden="true">
      <span className="opacity-0">SCICYBER&nbsp;</span>
      <div className="relative">
        <span className="opacity-0">LAB</span>
        <div className="absolute -bottom-1 left-0 w-full h-[5px] bg-[#10C1DD] z-10"></div>
      </div>
    </div>
  </div>
);

const CustomIllustration = () => (
  <div className="relative w-full max-w-[800px] h-[350px] mx-auto flex items-center justify-center">
    {/* Background Blob */}
    <div className="absolute inset-0 bg-[#FDFAF6] rounded-[100px] scale-y-[0.8] transform"></div>

    {/* Clouds */}
    <div className="absolute top-10 left-20 w-32 h-12 bg-[#E6E6E9] rounded-full"></div>
    <div className="absolute top-20 right-32 w-48 h-16 bg-[#E6E6E9] rounded-full"></div>
    <div className="absolute top-16 left-[40%] w-24 h-10 bg-[#A3B1B7] rounded-full"></div>

    {/* Connections (Lines) */}
    <div className="absolute top-[160px] left-[250px] w-[300px] h-[3px] bg-[#606578]"></div>
    <div className="absolute top-[100px] left-[400px] w-[3px] h-[100px] bg-[#606578]"></div>

    {/* Phone */}
    <div className="absolute top-6 left-[370px] w-[60px] h-[110px] bg-[#2D334A] rounded-lg border-[3px] border-[#606578] flex flex-col items-center py-2 z-20">
      <div className="w-8 h-8 bg-[#F8535B] rounded-full flex items-center justify-center mb-2">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <div className="w-10 h-1.5 bg-[#A5C1CC] mt-1 rounded-full"></div>
      <div className="w-10 h-1.5 bg-[#A5C1CC] mt-1 rounded-full"></div>
      <div className="w-10 h-1.5 bg-[#A5C1CC] mt-1 rounded-full"></div>
    </div>

    {/* Monitor */}
    <div className="absolute top-[180px] left-[350px] flex flex-col items-center z-20">
      <div className="w-[150px] h-[100px] bg-[#2D334A] rounded-lg border-[4px] border-[#606578] p-3 flex justify-between">
        <div className="flex flex-col gap-2 w-1/2">
          <div className="w-12 h-2 bg-[#F8535B] rounded-full"></div>
          <div className="w-16 h-2 bg-[#A5C1CC] rounded-full"></div>
          <div className="w-10 h-2 bg-[#A5C1CC] rounded-full"></div>
        </div>
        <div className="w-1/2 flex items-center justify-center relative">
          <div className="w-12 h-12 border-[3px] border-[#A5C1CC] rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-[#A5C1CC] rounded-sm"></div>
          </div>
          <div className="absolute -top-2 right-0 bg-white text-[8px] font-bold px-1 rounded">RISK</div>
        </div>
      </div>
      <div className="w-6 h-10 bg-[#606578]"></div>
      <div className="w-32 h-3 bg-[#606578] rounded-full"></div>
    </div>

    {/* Cloud with Check */}
    <div className="absolute top-12 right-[280px] w-[140px] h-[80px] bg-[#A5C1CC] rounded-full flex items-center justify-center z-10">
      <div className="w-12 h-12 bg-[#F8535B] rounded-full flex items-center justify-center border-[4px] border-white ml-8">
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    {/* Smartwatch / Hand */}
    <div className="absolute top-[140px] left-[150px] flex items-center z-20">
      <div className="w-24 h-12 bg-[#EBAC9A] rounded-l-full"></div>
      <div className="w-10 h-16 bg-[#2D334A] rounded-md border-[3px] border-[#606578] -ml-4 z-10 flex items-center justify-center">
        <div className="w-6 h-6 bg-[#A5C1CC] rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
      </div>
      <div className="w-20 h-8 bg-[#EBAC9A] rounded-r-full -ml-2 flex items-center pl-2">
        <div className="w-16 h-1 bg-white rounded-full"></div>
      </div>
    </div>

    {/* Doctor Figure */}
    <div className="absolute top-[120px] right-[180px] flex flex-col items-center z-20">
      <div className="w-16 h-16 bg-[#E6E6E9] rounded-full border-[4px] border-white flex items-center justify-center relative z-10">
        <div className="flex gap-1 absolute top-4">
          <div className="w-5 h-5 border-[3px] border-[#FCDD5B] rounded-full"></div>
          <div className="w-5 h-5 border-[3px] border-[#FCDD5B] rounded-full"></div>
        </div>
      </div>
      <div className="w-28 h-36 bg-white rounded-t-[40px] -mt-2 relative overflow-hidden border-[3px] border-[#E6E6E9]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-full bg-[#E6E6E9]"></div>
        <div className="absolute top-6 left-4 w-6 h-16 border-[3px] border-[#F8535B] rounded-full border-t-0"></div>
        <div className="absolute top-[80px] left-6 w-4 h-4 bg-[#606578] rounded-full"></div>
      </div>
      <div className="absolute top-10 -left-8 w-10 h-4 bg-[#EBAC9A] rounded-full transform -rotate-45"></div>
      <div className="absolute top-10 -right-8 w-10 h-4 bg-[#EBAC9A] rounded-full transform rotate-45"></div>
    </div>

    {/* Plants/Leaves */}
    <div className="absolute bottom-10 left-[250px] flex gap-2 z-0">
      <div className="w-3 h-16 bg-[#C9C2BE] rounded-full transform -rotate-[30deg]"></div>
      <div className="w-3 h-20 bg-[#C9C2BE] rounded-full"></div>
      <div className="w-3 h-12 bg-[#C9C2BE] rounded-full transform rotate-[30deg]"></div>
    </div>
    <div className="absolute bottom-12 right-[120px] flex gap-2 z-0">
      <div className="w-3 h-12 bg-[#C9C2BE] rounded-full transform -rotate-[20deg]"></div>
      <div className="w-3 h-16 bg-[#C9C2BE] rounded-full transform rotate-[10deg]"></div>
    </div>
    <div className="absolute bottom-8 left-[320px] flex gap-1 z-0">
      <div className="w-2 h-8 bg-[#F8535B] rounded-full transform -rotate-[20deg]"></div>
      <div className="w-2 h-10 bg-[#F8535B] rounded-full"></div>
      <div className="w-2 h-6 bg-[#F8535B] rounded-full transform rotate-[20deg]"></div>
    </div>
  </div>
);

const HomePage = () => {
  const [user, setUser] = useState(null);
  const { instance } = useMsal();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FBFF] to-[#EAEAEA] overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-[1440px] mx-auto px-10 lg:px-20 py-8 flex justify-between items-center z-50 relative">
        <div className="flex items-center gap-16">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-base">
            <Link to="/products" className="hover:text-[#10C1DD] transition-colors">Pricing</Link>
            <a href="#about" className="hover:text-[#10C1DD] transition-colors">Partners</a>
            <a href="#footer" className="hover:text-[#10C1DD] transition-colors">Contacts</a>
          </nav>
        </div>
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
            <CustomIllustration />
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
              {user ? (
                <Link to="/dashboard" className="hover:text-[#10C1DD] transition-colors">Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" className="hover:text-[#10C1DD] transition-colors">Sign in</Link>
                  <Link to="/login" className="border-2 border-[#AED486] rounded-xl px-6 py-2 hover:bg-[#AED486] hover:text-white transition-colors">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
