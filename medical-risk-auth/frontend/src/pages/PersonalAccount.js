import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Camera, Users, CalendarDays } from 'lucide-react';
import API_BASE_URL from '../config';

const ProjectsIcon = ({ className }) => (
  <svg
    width="25"
    height="25"
    viewBox="0 0 25 25"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g clipPath="url(#projects-icon-clip)">
      <path d="M2.73438 0H22.2656C23.775 0 25 1.225 25 2.73438V22.2656C25 22.9908 24.7119 23.6863 24.1991 24.1991C23.6863 24.7119 22.9908 25 22.2656 25H2.73438C2.00917 25 1.31367 24.7119 0.80088 24.1991C0.288085 23.6863 0 22.9908 0 22.2656L0 2.73438C0 1.225 1.225 0 2.73438 0ZM2.34375 2.73438V22.2656C2.34375 22.4813 2.51875 22.6562 2.73438 22.6562H22.2656C22.3692 22.6562 22.4686 22.6151 22.5418 22.5418C22.6151 22.4686 22.6562 22.3692 22.6562 22.2656V2.73438C22.6562 2.63077 22.6151 2.53142 22.5418 2.45816C22.4686 2.38491 22.3692 2.34375 22.2656 2.34375H2.73438C2.63077 2.34375 2.53142 2.38491 2.45816 2.45816C2.38491 2.53142 2.34375 2.63077 2.34375 2.73438ZM18.3594 4.6875C18.6702 4.6875 18.9682 4.81097 19.188 5.03073C19.4078 5.2505 19.5312 5.54857 19.5312 5.85938V17.5781C19.5312 17.8889 19.4078 18.187 19.188 18.4068C18.9682 18.6265 18.6702 18.75 18.3594 18.75C18.0486 18.75 17.7505 18.6265 17.5307 18.4068C17.311 18.187 17.1875 17.8889 17.1875 17.5781V5.85938C17.1875 5.54857 17.311 5.2505 17.5307 5.03073C17.7505 4.81097 18.0486 4.6875 18.3594 4.6875ZM5.46875 5.85938C5.46875 5.54857 5.59222 5.2505 5.81198 5.03073C6.03175 4.81097 6.32982 4.6875 6.64062 4.6875C6.95143 4.6875 7.2495 4.81097 7.46927 5.03073C7.68903 5.2505 7.8125 5.54857 7.8125 5.85938V14.4531C7.8125 14.7639 7.68903 15.062 7.46927 15.2818C7.2495 15.5015 6.95143 15.625 6.64062 15.625C6.32982 15.625 6.03175 15.5015 5.81198 15.2818C5.59222 15.062 5.46875 14.7639 5.46875 14.4531V5.85938ZM12.5 4.6875C12.8108 4.6875 13.1089 4.81097 13.3286 5.03073C13.5484 5.2505 13.6719 5.54857 13.6719 5.85938V11.3281C13.6719 11.6389 13.5484 11.937 13.3286 12.1568C13.1089 12.3765 12.8108 12.5 12.5 12.5C12.1892 12.5 11.8911 12.3765 11.6714 12.1568C11.4516 11.937 11.3281 11.6389 11.3281 11.3281V5.85938C11.3281 5.54857 11.4516 5.2505 11.6714 5.03073C11.8911 4.81097 12.1892 4.6875 12.5 4.6875Z" fill="#11C1DD" />
    </g>
    <defs>
      <clipPath id="projects-icon-clip">
        <rect width="25" height="25" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const RolesIcon = ({ className }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g clipPath="url(#roles-icon-clip)">
      <path d="M15.3854 2.30053C15.262 1.76808 14.9545 1.29633 14.5172 0.968519C14.0798 0.640709 13.5408 0.477909 12.9951 0.508847C12.4494 0.539786 11.9322 0.762474 11.5347 1.13762C11.1372 1.51276 10.885 2.01624 10.8226 2.55922C10.7602 3.1022 10.8916 3.64978 11.1936 4.10533C11.4956 4.56087 11.9488 4.89511 12.4732 5.04906C12.9976 5.203 13.5596 5.16676 14.0599 4.94673C14.5602 4.7267 14.9667 4.33703 15.2077 3.84646C16.6747 4.18052 18.0384 4.86643 19.1812 5.84502C20.3241 6.82362 21.2117 8.06553 21.7676 9.46364L23.182 8.90742C22.5273 7.24912 21.4729 5.77828 20.1127 4.62565C18.7526 3.47302 17.1287 2.67431 15.3854 2.30053ZM13.1366 3.60581C13.0331 3.60913 12.9299 3.59161 12.8333 3.55428C12.7366 3.51695 12.6485 3.46058 12.5741 3.38851C12.4996 3.31644 12.4405 3.23015 12.4001 3.13476C12.3597 3.03937 12.3388 2.93683 12.3388 2.83324C12.3388 2.72964 12.3597 2.6271 12.4001 2.53171C12.4405 2.43632 12.4996 2.35003 12.5741 2.27796C12.6485 2.20589 12.7366 2.14952 12.8333 2.11219C12.9299 2.07486 13.0331 2.05734 13.1366 2.06067C13.3416 2.06067 13.5382 2.1421 13.6832 2.28706C13.8281 2.43202 13.9096 2.62863 13.9096 2.83364C13.9096 3.03864 13.8281 3.23525 13.6832 3.38021C13.5382 3.52517 13.3416 3.60581 13.1366 3.60581ZM9.73635 4.24809L9.16499 2.83443C7.50669 3.48919 6.03585 4.54352 4.88322 5.90371C3.73059 7.2639 2.93188 8.8878 2.55809 10.6311C2.02565 10.7544 1.5539 11.0619 1.22609 11.4993C0.898277 11.9366 0.735477 12.4757 0.766416 13.0214C0.797354 13.567 1.02004 14.0843 1.39519 14.4817C1.77033 14.8792 2.27381 15.1314 2.81679 15.1938C3.35977 15.2562 3.90735 15.1249 4.3629 14.8229C4.81844 14.5209 5.15268 14.0677 5.30662 13.5433C5.46057 13.0188 5.42433 12.4569 5.2043 11.9566C4.98427 11.4563 4.59459 11.0497 4.10403 10.8088C4.43947 9.34002 5.12761 7.97508 6.10896 6.83198C7.0903 5.68888 8.33532 4.80202 9.73635 4.24809ZM3.09041 13.6528C2.9889 13.6528 2.88839 13.6328 2.79461 13.594C2.70082 13.5551 2.61561 13.4982 2.54384 13.4264C2.47206 13.3546 2.41512 13.2694 2.37628 13.1756C2.33743 13.0819 2.31744 12.9813 2.31744 12.8798C2.31744 12.7783 2.33743 12.6778 2.37628 12.584C2.41512 12.4903 2.47206 12.405 2.54384 12.3333C2.61561 12.2615 2.70082 12.2046 2.79461 12.1657C2.88839 12.1269 2.9889 12.1069 3.09041 12.1069C3.29541 12.1069 3.49202 12.1883 3.63698 12.3333C3.78194 12.4782 3.86338 12.6748 3.86338 12.8798C3.86338 13.0848 3.78194 13.2815 3.63698 13.4264C3.49202 13.5714 3.29541 13.6528 3.09041 13.6528ZM13.1366 20.6071C12.7055 20.6085 12.2834 20.7301 11.9175 20.9581C11.5517 21.1862 11.2566 21.5117 11.0655 21.8981C9.5983 21.5641 8.23436 20.8781 7.09138 19.8993C5.9484 18.9206 5.0607 17.6785 4.50486 16.2801L3.0912 16.8515C3.74809 18.5126 4.80596 19.9852 6.17041 21.1381C7.53487 22.2909 9.16348 23.088 10.9109 23.4584C11.0113 23.8838 11.2299 24.2722 11.5415 24.5787C11.853 24.8853 12.2449 25.0976 12.6719 25.1911C13.0989 25.2846 13.5436 25.2555 13.9548 25.1071C14.366 24.9588 14.7268 24.6973 14.9958 24.3527C15.2648 24.0082 15.4309 23.5946 15.475 23.1597C15.519 22.7248 15.4393 22.2864 15.245 21.8948C15.0506 21.5033 14.7496 21.1747 14.3765 20.9468C14.0035 20.719 13.5737 20.6012 13.1366 20.6071ZM13.1366 23.6982C12.9316 23.6982 12.735 23.6168 12.59 23.4718C12.4451 23.3269 12.3636 23.1302 12.3636 22.9252C12.3636 22.7202 12.4451 22.5236 12.59 22.3787C12.735 22.2337 12.9316 22.1523 13.1366 22.1523C13.3416 22.1523 13.5382 22.2337 13.6832 22.3787C13.8281 22.5236 13.9096 22.7202 13.9096 22.9252C13.9096 23.1302 13.8281 23.3269 13.6832 23.4718C13.5382 23.6168 13.3416 23.6982 13.1366 23.6982ZM25.5001 12.879C25.5015 12.4653 25.3922 12.0587 25.1835 11.7014C24.9748 11.3442 24.6743 11.0493 24.3132 10.8473C23.9521 10.6453 23.5436 10.5436 23.1299 10.5528C22.7163 10.5619 22.3126 10.6816 21.9608 10.8994C21.609 11.1171 21.3218 11.425 21.1292 11.7912C20.9365 12.1573 20.8452 12.5683 20.865 12.9816C20.8847 13.3949 21.0146 13.7954 21.2413 14.1415C21.468 14.4877 21.7831 14.7668 22.1541 14.9501C21.8199 16.4172 21.1339 17.781 20.1551 18.9238C19.1764 20.0667 17.9343 20.9542 16.5361 21.51L17.1082 22.9244C18.7693 22.2676 20.242 21.2097 21.3948 19.8452C22.5477 18.4808 23.3448 16.8522 23.7151 15.1047C24.2182 14.9857 24.667 14.7021 24.9904 14.2989C25.3138 13.8956 25.4932 13.3959 25.5001 12.879ZM23.1812 13.652C22.9762 13.652 22.7796 13.5706 22.6346 13.4256C22.4897 13.2807 22.4083 13.084 22.4083 12.879C22.4083 12.674 22.4897 12.4774 22.6346 12.3325C22.7796 12.1875 22.9762 12.1061 23.1812 12.1061C23.3862 12.1061 23.5828 12.1875 23.7278 12.3325C23.8728 12.4774 23.9542 12.674 23.9542 12.879C23.9542 13.084 23.8728 13.2807 23.7278 13.4256C23.5828 13.5706 23.3862 13.652 23.1812 13.652Z" fill="#11C1DD" />
      <path d="M15.2921 12.7789C15.7317 12.3496 16.0334 11.799 16.1587 11.1974C16.284 10.5958 16.2271 9.97051 15.9953 9.4014C15.7635 8.83229 15.3674 8.34518 14.8575 8.00226C14.3476 7.65935 13.747 7.4762 13.1325 7.4762C12.518 7.4762 11.9175 7.65935 11.4076 8.00226C10.8977 8.34518 10.5015 8.83229 10.2697 9.4014C10.038 9.97051 9.98109 10.5958 10.1063 11.1974C10.2316 11.799 10.5333 12.3496 10.973 12.7789C10.4498 13.1325 10.0212 13.609 9.72475 14.1666C9.4283 14.7242 9.27301 15.346 9.27246 15.9775V17.5227H16.9998V15.9767C16.9984 15.3446 16.842 14.7224 16.5443 14.1647C16.2466 13.607 15.8166 13.1317 15.2921 12.7789ZM11.5906 10.5675C11.5906 10.3645 11.6306 10.1635 11.7082 9.97594C11.7859 9.78838 11.8998 9.61796 12.0434 9.47441C12.1869 9.33085 12.3573 9.21698 12.5449 9.13929C12.7325 9.0616 12.9335 9.02161 13.1365 9.02161C13.3395 9.02161 13.5406 9.0616 13.7281 9.13929C13.9157 9.21698 14.0861 9.33085 14.2297 9.47441C14.3732 9.61796 14.4871 9.78838 14.5648 9.97594C14.6425 10.1635 14.6824 10.3645 14.6824 10.5675C14.6824 10.9776 14.5196 11.3708 14.2297 11.6607C13.9397 11.9506 13.5465 12.1135 13.1365 12.1135C12.7265 12.1135 12.3333 11.9506 12.0434 11.6607C11.7534 11.3708 11.5906 10.9776 11.5906 10.5675ZM10.8176 15.9767C10.8119 15.6687 10.8676 15.3625 10.9816 15.0762C11.0955 14.7899 11.2654 14.5292 11.4813 14.3093C11.6971 14.0894 11.9546 13.9147 12.2388 13.7955C12.5229 13.6763 12.828 13.6148 13.1361 13.6148C13.4443 13.6148 13.7493 13.6763 14.0334 13.7955C14.3176 13.9147 14.5751 14.0894 14.791 14.3093C15.0068 14.5292 15.1767 14.7899 15.2906 15.0762C15.4046 15.3625 15.4603 15.6687 15.4546 15.9767H10.8176Z" fill="#11C1DD" />
    </g>
    <defs>
      <clipPath id="roles-icon-clip">
        <rect width="25.5" height="25.5" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

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

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {
        first_name: formData.firstName,
        department: formData.department,
        position: formData.position,
      };

      if (formData.lastName) {
        payload.last_name = formData.lastName;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update profile:', response.status, errorText);
        return;
      }

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      await loadUserData();
      setIsEditingProfile(false);
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
          <div className="bg-white rounded-lg px-[14px] py-[12px] w-full xl:w-[866px] xl:self-center min-h-[160px] shadow-sm flex items-center gap-[8px]">

            {/* 4 поля: 2×2 сетка */}
            <div className="flex flex-col gap-[8px] flex-1 min-w-0">
              {/* Ряд 1 */}
              <div className="flex gap-[8px]">
                <div className="relative border border-[#6E6E6E] rounded-lg h-[50px] flex-1 min-w-0">
                  <label className="absolute top-[5px] left-[14px] text-[14px] text-black font-open-sans leading-none pointer-events-none z-10">Имя<span className="text-[#ED3333]">*</span></label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} onKeyDown={handleEditKeyDown}
                    className="absolute inset-0 w-full h-full px-[14px] pt-[18px] pb-[4px] text-[12px] text-[#6E6E6E] outline-none border-0 rounded-lg font-open-sans bg-transparent" />
                </div>
                <div className="relative border border-[#6E6E6E] rounded-lg h-[50px] flex-1 min-w-0">
                  <label className="absolute top-[5px] left-[14px] text-[14px] text-black font-open-sans leading-none pointer-events-none z-10">Дата рождения<span className="text-[#ED3333]">*</span></label>
                  <input type="text" name="birthDate" value={formData.birthDate} onChange={handleInputChange} onKeyDown={handleEditKeyDown}
                    className="absolute inset-0 w-full h-full px-[14px] pt-[18px] pb-[4px] text-[12px] text-[#6E6E6E] outline-none border-0 rounded-lg font-open-sans bg-transparent" />
                </div>
              </div>
              {/* Ряд 2 */}
              <div className="flex gap-[8px]">
                <div className="relative border border-[#6E6E6E] rounded-lg h-[50px] flex-1 min-w-0">
                  <label className="absolute top-[5px] left-[14px] text-[14px] text-black font-open-sans leading-none pointer-events-none z-10">Департамент<span className="text-[#ED3333]">*</span></label>
                  <input type="text" name="department" value={formData.department} onChange={handleInputChange} onKeyDown={handleEditKeyDown}
                    className="absolute inset-0 w-full h-full px-[14px] pt-[18px] pb-[4px] text-[12px] text-[#6E6E6E] outline-none border-0 rounded-lg font-open-sans bg-transparent" />
                </div>
                <div className="relative border border-[#6E6E6E] rounded-lg h-[50px] flex-1 min-w-0">
                  <label className="absolute top-[5px] left-[14px] text-[14px] text-black font-open-sans leading-none pointer-events-none z-10">Должность<span className="text-[#ED3333]">*</span></label>
                  <input type="text" name="position" value={formData.position} onChange={handleInputChange} onKeyDown={handleEditKeyDown}
                    className="absolute inset-0 w-full h-full px-[14px] pt-[18px] pb-[4px] text-[12px] text-[#6E6E6E] outline-none border-0 rounded-lg font-open-sans bg-transparent" />
                </div>
              </div>
            </div>

            {/* Пол + Сохранить + ID */}
            <div className="flex flex-col items-center gap-[10px] shrink-0 w-[156px]">
              {/* Пол */}
              <div className="flex items-center gap-[6px]">
                <span className="text-[10px] text-[#6E6E6E] font-open-sans">М</span>
                <div
                  className="bg-[#057642] rounded-[5px] w-[30px] h-[16px] relative cursor-pointer flex items-center transition-all duration-200 ease-out hover:scale-110 hover:brightness-110 active:scale-95"
                  onClick={() => setGender(gender === 'male' ? 'female' : 'male')}
                >
                  <div className={`absolute ${gender === 'female' ? 'right-[3px]' : 'left-[3px]'} w-[10px] h-[10px] bg-white rounded-full transition-all duration-200`}></div>
                </div>
                <span className="text-[10px] text-[#6E6E6E] font-open-sans">Ж</span>
              </div>
              {/* Кнопка */}
              <button onClick={handleSave} className="bg-[#DFEECF] text-black text-[10px] w-[156px] h-[28px] rounded-lg hover:bg-[#cde4b4] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:scale-[1.02] active:translate-y-0 active:scale-[0.98] font-raleway flex items-center justify-center">
                Сохранить
              </button>
              {/* ID */}
              <span className="text-[8px] text-[#6E6E6E] font-raleway text-center whitespace-nowrap">ID пользователя: {user?.id}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg px-[18px] py-[16px] relative min-h-[160px] w-full xl:w-[866px] xl:self-center flex flex-col justify-center shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start w-full">
              <div className="flex flex-col mb-4 sm:mb-0">
                <h1 className="text-[24px] font-bold text-black font-raleway leading-none mb-[15px]">{user?.firstName} {user?.lastName}</h1>
                <p className="text-[16px] text-black font-raleway leading-none mb-[10px]">
                  {user?.department || '---'} - {user?.position || user?.role || '---'}
                </p>
                <p className="text-[10px] text-[#6E6E6E] font-raleway leading-none">ID пользователя: {user?.id}</p>
              </div>
              <div className="flex items-start gap-4 sm:gap-[240px]">
                <span className="text-[16px] text-black font-raleway leading-none mt-1">{formData.birthDate || ''}</span>
                <button onClick={() => setIsEditingProfile(true)} className="cursor-pointer">
                  <Edit2 className="w-5 h-5 text-[#6E6E6E] transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
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
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Email<span className="text-[#ED3333]">*</span> <span className="text-[12px] text-[#6E6E6E]">основной</span></span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none truncate w-[250px] block">{user?.email || '---'}</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Email<span className="text-[#ED3333]">*</span> <span className="text-[12px] text-[#6E6E6E]">дополнительный</span></span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none truncate w-[250px] block">---</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Номер телефона<span className="text-[#ED3333]">*</span></span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none">{user?.phone || '---'}</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[80px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Linkedin</span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-tight block w-[250px] truncate">---</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg p-[20px] w-full max-w-[405px] h-[390px] shadow-sm">
          <h2 className="text-[16px] font-bold mb-[20px] font-raleway text-black">Безопасность и доступ</h2>
          <div className="space-y-[10px]">
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Изменение пароля</span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none">Последний раз изменен 3 месяца назад</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Двухфакторная аутентификация</span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none">Выкл.</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">Список доверенных IP</span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none">White list</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
            <div className="border border-[#6E6E6E] rounded-lg p-[12px] h-[65px] flex justify-between items-center">
              <div>
                <span className="text-[14px] text-black block mb-[5px] font-open-sans leading-none">История входов</span>
                <span className="text-[12px] text-[#6E6E6E] font-open-sans leading-none">Последний вход: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString('ru') : '---'}</span>
              </div>
              <Edit2 className="w-5 h-5 text-[#6E6E6E] cursor-pointer shrink-0 transition-all duration-200 ease-out hover:scale-110 hover:rotate-[-8deg] hover:text-[#11C1DD]" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="bg-white rounded-lg shadow-sm relative w-full pb-8">
        {/* pt-[50px] = 25px для кружка + 25px отступ сверху */}
        <div className="flex flex-wrap justify-center gap-8 xl:gap-[80px] pt-[35px] pb-[30px]">

          {[
            { icon: ProjectsIcon, count: projectsCount, label: 'Мои проекты', onClick: () => navigate('/dashboard') },
            { icon: RolesIcon, count: '---', label: 'Мои роли' },
            { icon: Users, count: '---', label: 'Команда' },
            { icon: CalendarDays, count: activeDays, label: 'Активные дни' },
          ].map((stat, i) => (
            <div
              key={i}
              className="group cursor-pointer transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.02]"
              style={{ width: 118, height: 143, position: 'relative' }}
              onClick={stat.onClick}
            >
              {/* Кружок с иконкой — торчит 25px выше карточки */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50px] h-[50px] bg-white border border-[#EAEAEA] shadow-[0px_4px_4px_rgba(0,0,0,0.25)] rounded-full flex items-center justify-center z-10">
                <stat.icon className={stat.label === 'Мои роли' ? 'w-[28px] h-[28px] text-[#11C1DD]' : 'w-[25px] h-[25px] text-[#11C1DD]'} />
              </div>

              {/* Карточка — начинается через 25px (середина кружка) */}
              <div className="absolute top-[25px] left-0 w-[118px] h-[118px] bg-white border border-[#EAEAEA] shadow-[4px_4px_10px_rgba(0,0,0,0.25)] rounded-lg transition-shadow duration-200 ease-out group-hover:shadow-[6px_8px_14px_rgba(0,0,0,0.28)]">
                {/* Число — 36px от верха карточки, line-height 50px */}
                <span className="absolute top-[36px] left-0 w-full text-[50px] font-bold text-[#6E6E6E] leading-[50px] font-open-sans text-center">
                  {stat.count}
                </span>
                {/* Лейбл — 91px от верха карточки (внутри карточки снизу) */}
                <span className="absolute top-[91px] left-0 w-full text-[12px] text-black font-open-sans text-center leading-[17px]">
                  {stat.label}
                </span>
              </div>
            </div>
          ))}

        </div>

        <div className="absolute bottom-[20px] right-[20px]">
          <button onClick={handleLogout} className="bg-[#F5B0AE] text-black text-[14px] w-[165px] h-[35px] rounded-lg hover:bg-[#f09a98] transition-colors font-raleway flex items-center justify-center">
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalAccount;
