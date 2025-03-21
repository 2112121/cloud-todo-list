import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { logoutUser } from '../firebase';

interface UserProfileProps {
  user: User | null;
  onLogout: () => void;
  showMenu: boolean;
  toggleMenu: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, showMenu, toggleMenu }) => {
  const [photoError, setPhotoError] = useState(false);
  
  // 重置照片錯誤狀態（當用戶變更時）
  useEffect(() => {
    setPhotoError(false);
  }, [user?.uid]);
  
  if (!user) return null;

  const handleLogout = async () => {
    try {
      await logoutUser();
      onLogout();
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  // 處理照片加載錯誤
  const handlePhotoError = () => {
    setPhotoError(true);
  };

  // 取得用戶頭像或創建名稱首字母圖標
  const getAvatarContent = (size: 'normal' | 'menu' = 'normal') => {
    if (user.photoURL && !photoError) {
      return (
        <img 
          src={user.photoURL} 
          alt={user.displayName || '用戶'} 
          className="w-full h-full object-cover rounded-full"
          onError={handlePhotoError}
        />
      );
    } else {
      const initials = user.displayName 
        ? user.displayName.charAt(0).toUpperCase() 
        : user.email 
          ? user.email.charAt(0).toUpperCase() 
          : '?';
      return <span className={`text-white font-medium ${size === 'normal' ? 'text-lg' : 'text-base'}`}>{initials}</span>;
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        {/* 用戶名稱顯示 - 僅在大屏幕上顯示 */}
        <div className="hidden sm:block mr-3">
          <p className="font-medium text-gray-800">{user.displayName || '用戶'}</p>
        </div>
        
        {/* 設定按鈕 */}
        <button
          onClick={toggleMenu}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 text-white cursor-pointer hover:bg-gray-700 transition-colors select-none shadow-md hover:shadow-lg"
          aria-label="用戶設置"
        >
          <i className="fas fa-cog text-xl"></i>
        </button>
      </div>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-10 border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
              {getAvatarContent('menu')}
            </div>
            <div className="overflow-hidden">
              <p className="font-medium text-gray-800 truncate">{user.displayName || '用戶'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full text-left block px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-2"></i>
            登出
          </button>
        </div>
      )}
    </div>
  );
};

export default UserProfile; 