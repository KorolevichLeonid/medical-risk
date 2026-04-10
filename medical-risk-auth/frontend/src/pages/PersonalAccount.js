import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Camera, Briefcase, UserCheck, Users, CalendarDays } from 'lucide-react';
import API_BASE_URL from '../config';

const PersonalAccount = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [gender, setGender] = useState('female');
  const [projectsCount, setProjectsCount] = useState(0);
  const [activeDays, setActiveDays] = useState('---');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    position: '',
    birthDate: '',
  });

  useEffect(() => {
    loadUserData();
    loadProjectsCount();
    loadActiveDays();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        const u = {
          id: userData.id,
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.email,
          phone: userData.phone || '',
          department: userData.department || '',
          position: userData.position || '',
          role: userData.role,
          avatar: userData.avatar_url || null,
          joinDate: userData.created_at,
          lastLogin: userData.last_login,
        };
        setUser(u);
        setFormData({
          firstName: u.firstName,
          lastName: u.lastName,
          department: u.department,
          position: u.position,
          birthDate: '',
        });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projects/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const projects = await response.json();
        setProjectsCount(projects.length);
      }
    } catch (error) {
      console.error('Failed to load projects count:', error);
    }
  };

  const loadActiveDays = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        if (userData.created_at) {
          const joinDate = new Date(userData.created_at);
          const today = new Date();
          setActiveDays(Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)));
        }
      }
    } catch (error) {
      console.error('Failed to load active days:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
        })
      });
      if (response.ok) {
        const updatedUser = await response.json();
        localStorage.setItem('user', JSON.stringify(updatedUser));
        loadUserData();
        setIsEditingProfile(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getInitials = () => {
    if (!user?.firstName && !user?.lastName) return 'U';
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1274px] mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col xl:flex-row items-center xl:items-start relative mb-12 mt-8 xl:ml-[60px]">
        {/* Avatar */}
        <div className="relative mb-8 xl:mb-0 xl:mr-[60px] shrink-0">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-[160px] h-[160px] rounded-full border border-white object-cover" />
          ) : (
            <div className="w-[160px] h-[160px] rounded-full border border-white bg-[#8b9dc3] flex items-center justify-center text-white text-5xl font-semibold">
              {getInitials()}
            </div>
          )}
          <div className="absolute bottom-[20px] right-[10px] w-[18px] h-[18px] bg-[#9ACD32] border border-white rounded-full"></div>
          <button className="absolute bottom-[10px] right-[40px] w-[30px] h-[30px] bg-[#EAEAEA] border border-white rounded-full flex items-center justify-center shadow-sm">
            <Camera className="w-4 h-4 text-[#6E6E6E]" />
          </button>
        </div>

        {/* Info */}
        {isEditingProfile ? (
          <div className="bg-white rounded-lg p-[16px] relative h-[116px] w-full xl:w-[866px] flex items-center justify-between shadow-sm">
            <div className="grid grid-cols-2 gap-x-[20px] gap-y-[12px] w-[636px]">
              <div className="border border-[#6E6E6E] rounded-lg px-[18px] py-[4px] h-[42px] flex flex-col justify-center">
                <label className="text-[10px] text-black block font-open-sans leading-none mb-[2px]">Имя<span className="text-[#ED3333]">*</span></label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full text-[14px] text-[#6E6E6E] outline-none font-open-sans bg-transparent leading-none" />
              </div>
              <div className="border border-[#6E6E6E] rounded-lg px-[18px] py-[4px] h-[42px] flex flex-col justify-center">
                <label className="text-[10px] text-black block font-open-sans leading-none mb-[2px]">Дата рождения<span className="text-[#ED3333]">*</span></label>
                <input type="text" name="birthDate" value={formData.birthDate} onChange={handleInputChange} className="w-full text-[14px] text-[#6E6E6E] outline-none font-open-sans bg-transparent leading-none" />
              </div>
              <div className="border border-[#6E6E6E] rounded-lg px-[18px] py-[4px] h-[42px] flex flex-col justify-center">
                <label className="text-[10px] text-black block font-open-sans leading-none mb-[2px]">Департамент<span className="text-[#ED3333]">*</span></label>
                <input type="text" name="department" value={formData.department} onChange={handleInputChange} className="w-full text-[14px] text-[#6E6E6E] outline-none font-open-sans bg-transparent leading-none" />
              </div>
              <div className="border border-[#6E6E6E] rounded-lg px-[18px] py-[4px] h-[42px] flex flex-col justify-center">
                <label className="text-[10px] text-black block font-open-sans leading-none mb-[2px]">Должность<span className="text-[#ED3333]">*</span></label>
                <input type="text" name="position" value={formData.position} onChange={handleInputChange} className="w-full text-[14px] text-[#6E6E6E] outline-none font-open-sans bg-transparent leading-none" />
              </div>
            </div>

            <div className="flex flex-col items-center justify-between h-[87px] w-[156px]">
              <div className="flex items-center justify-between w-[60px] -ml-[2px] mb-[16px]">
                <span className="text-[8px] text-[#6E6E6E] font-open-sans">М</span>
                <div
                  className={`flex items-center ${gender === 'female' ? 'bg-[#057642]' : 'bg-[#057642]'} rounded-[5px] w-[30px] h-[16px] relative cursor-pointer`}
                  onClick={() => setGender(gender === 'male' ? 'female' : 'male')}
                >
                  <div className={`absolute ${gender === 'female' ? 'right-[2px]' : 'left-[2px]'} top-[3px] w-[10px] h-[10px] bg-white rounded-full transition-all`}></div>
                </div>
                <span className="text-[8px] text-[#6E6E6E] font-open-sans">Ж</span>
              </div>
              <button onClick={handleSave} className="bg-[#DFEECF] text-black text-[10px] w-[156px] h-[28px] rounded-lg hover:bg-[#cde4b4] transition-colors font-raleway flex items-center justify-center mb-[2px]">
                Сохранить
              </button>
              <span className="text-[8px] text-[#6E6E6E] font-raleway w-full text-center">ID пользователя: {user?.id}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg px-[18px] py-[16px] relative min-h-[116px] w-full xl:w-[866px] flex flex-col justify-center shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start w-full">
              <div className="flex flex-col mb-4 sm:mb-0">
                <h1 className="text-[24px] font-bold text-black font-raleway leading-none mb-[15px]">{user?.firstName} {user?.lastName}</h1>
                <p className="text-[16px] text-black font-raleway leading-none mb-[10px]">
                  {user?.department || '---'} - {user?.position || user?.role || '---'}
                </p>
                <p className="text-[14px] text-[#6E6E6E] font-raleway leading-none">ID пользователя: {user?.id}</p>
              </div>
              <div className="flex items-start gap-4 sm:gap-[240px]">
                <span className="text-[16px] text-black font-raleway leading-none mt-1">{formData.birthDate || ''}</span>
                <button onClick={() => setIsEditingProfile(true)} className="cursor-pointer">
                  <Edit2 className="w-5 h-5 text-[#6E6E6E]" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contacts and Security */}
      <div className="flex flex-col xl:flex-row justify-center items-center xl:items-start gap-8 xl:gap-[55px] mb-[55px] xl:ml-[60px]">
        {/* Contacts */}
        <div className="bg-white rounded-lg p-[20px] w-full max-w-[405px] h-[390px] shadow-sm">
          <h2 className="text-[16px] font-bold mb-[20px] font-raleway text-black">Контакты и связь</h2>
          <div className="space-y-[10px]">
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Email<span className="text-[#ED3333]">*</span> <span className="text-[6px] text-[#6E6E6E]">основной</span></span>
                <span className="text-[14px] text-[#6E6E6E] font-open-sans leading-none truncate w-[250px] block">{user?.email || '---'}</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Email<span className="text-[#ED3333]">*</span> <span className="text-[6px] text-[#6E6E6E]">дополнительный</span></span>
                <span className="text-[14px] text-[#6E6E6E] font-open-sans leading-none truncate w-[250px] block">---</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Номер телефона<span className="text-[#ED3333]">*</span></span>
                <span className="text-[14px] text-[#6E6E6E] font-open-sans leading-none">{user?.phone || '---'}</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[80px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Linkedin</span>
                <span className="text-[14px] text-[#6E6E6E] font-open-sans leading-tight block w-[250px] truncate">---</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg p-[20px] w-full max-w-[405px] h-[390px] shadow-sm">
          <h2 className="text-[16px] font-bold mb-[20px] font-raleway text-black">Безопасность и доступ</h2>
          <div className="space-y-[10px]">
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Изменение пароля</span>
                <span className="text-[6px] text-[#6E6E6E] font-open-sans leading-none">Последний раз изменен 3 месяца назад</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Двухфакторная аутентификация</span>
                <span className="text-[6px] text-[#6E6E6E] font-open-sans leading-none">Выкл.</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">Список доверенных IP</span>
                <span className="text-[6px] text-[#6E6E6E] font-open-sans leading-none">White list</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[10px] text-black block mb-[5px] font-open-sans leading-none">История входов</span>
                <span className="text-[6px] text-[#6E6E6E] font-open-sans leading-none">Последний вход: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('ru') : '---'}</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="bg-white rounded-lg shadow-sm relative w-full min-h-[249px] pb-16 xl:pb-0">
        <div className="flex flex-wrap justify-center gap-8 xl:gap-[118px] items-center h-full pt-[40px] xl:pt-[29px] pb-[40px] xl:pb-[102px]">

          {[
            { icon: Briefcase, count: projectsCount, label: 'Мои проекты', onClick: () => navigate('/dashboard') },
            { icon: UserCheck, count: '---', label: 'Мои роли' },
            { icon: Users, count: '---', label: 'Команда' },
            { icon: CalendarDays, count: activeDays, label: 'Активные дни' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center mt-6 xl:mt-0 cursor-pointer" onClick={stat.onClick}>
              <div className="w-[118px] h-[118px] bg-white border border-[#EAEAEA] shadow-[4px_4px_10px_rgba(0,0,0,0.25)] rounded-lg flex flex-col items-center justify-center relative">
                <div className="absolute -top-[25px] w-[50px] h-[50px] bg-white border border-[#EAEAEA] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] rounded-full flex items-center justify-center">
                  <stat.icon className="w-[25px] h-[25px] text-[#11C1DD]" />
                </div>
                <span className="text-[50px] font-bold text-[#6E6E6E] leading-none mt-[10px] font-open-sans">{stat.count}</span>
              </div>
              <span className="text-[10px] text-black mt-[15px] font-open-sans h-[17px] flex items-center">{stat.label}</span>
            </div>
          ))}

        </div>

        <div className="absolute bottom-[20px] right-[20px]">
          <button onClick={handleLogout} className="bg-[#F5B0AE] text-black text-[14px] w-[165px] h-[35px] rounded-lg hover:bg-[#f09a98] transition-colors font-raleway flex items-center justify-center">
            Выход
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalAccount;
