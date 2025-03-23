import React, { useState, useEffect } from 'react';
import { signInWithGoogle, loginWithEmail, registerWithEmail } from '../firebase';

interface AuthProps {
  onLoginSuccess: (user: any) => void;
  onError: (error: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onError }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(true);

  // 檢查是否啟用Google登錄
  useEffect(() => {
    const checkGoogleAuth = async () => {
      try {
        setGoogleEnabled(true);
      } catch (error) {
        console.error("Failed to check auth config:", error);
        setGoogleEnabled(false);
      }
    };

    checkGoogleAuth();
  }, []);

  // 處理 Google 登錄
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!googleEnabled) {
        setError('Google 登錄未正確配置，請使用電子郵件登錄');
        return;
      }
      
      await signInWithGoogle();
      onLoginSuccess(true);
    } catch (err: any) {
      console.error('Google 登錄錯誤:', err);
      
      // 處理特定錯誤情況
      if (err.code === 'auth/configuration-not-found') {
        setError('Google 登錄未正確配置，請使用電子郵件登錄');
      } else if (err.code === 'auth/popup-blocked') {
        setError('登錄彈窗被阻止，請允許彈窗後重試');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('登錄過程中彈窗被關閉，請重試');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('登錄請求已取消，請重試');
      } else if (err.code === 'auth/network-request-failed') {
        setError('網絡連接失敗，請檢查您的網絡連接');
      } else if (err.message === '認證服務未初始化') {
        setError('Firebase 認證服務未初始化，請聯系管理員');
      } else {
        setError(err.message || '登入失敗，請重試');
      }
    } finally {
      setLoading(false);
    }
  };

  // 處理電子郵件認證
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('請填寫所有必填欄位');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      if (isRegistering) {
        if (!displayName) {
          setError('請填寫顯示名稱');
          setLoading(false);
          return;
        }
        await registerWithEmail(email, password, displayName);
      } else {
        await loginWithEmail(email, password);
      }
      
      onLoginSuccess(true);
    } catch (err: any) {
      console.error('電子郵件認證錯誤:', err);
      
      // 處理特定錯誤代碼
      if (err.code === 'auth/email-already-in-use') {
        setError('此電子郵件已被使用，請嘗試登錄或使用其他郵箱');
      } else if (err.code === 'auth/weak-password') {
        setError('密碼太弱，請使用更強的密碼（至少6個字符）');
      } else if (err.code === 'auth/invalid-email') {
        setError('無效的電子郵件格式');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('電子郵件或密碼不正確');
      } else if (err.code === 'auth/too-many-requests') {
        setError('登錄嘗試次數過多，請稍後重試');
      } else if (err.code === 'auth/configuration-not-found') {
        setError('Firebase 認證未正確配置，請聯系管理員');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('電子郵件/密碼認證方法未在 Firebase 控制台啟用。請聯系管理員開啟此功能。');
      } else if (err.code === 'auth/network-request-failed') {
        setError('網絡連接失敗，請檢查您的網絡連接');
      } else if (err.message === '認證服務未初始化') {
        setError('Firebase 認證服務未初始化，請聯系管理員');
      } else {
        setError(err.message || (isRegistering ? '註冊失敗' : '登入失敗'));
      }
    } finally {
      setLoading(false);
    }
  };

  // 顯示加載狀態
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-slate-100 to-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">正在處理認證...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          {isRegistering ? '創建帳號' : '登入帳號'}
        </h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                顯示名稱
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 auth-form-input"
                placeholder="您的名稱"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              電子郵件
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 auth-form-input"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密碼
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 auth-form-input"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium disabled:opacity-50 auth-form-button"
          >
            {loading ? '處理中...' : isRegistering ? '註冊' : '登入'}
          </button>
        </form>
        
        <div className="mt-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || !googleEnabled}
            className="w-full py-2 px-4 bg-white border border-slate-300 text-gray-700 rounded-lg hover:bg-slate-50 flex items-center justify-center font-medium disabled:opacity-50 auth-google-button"
          >
            <i className="fab fa-google mr-2 text-[#4285F4]"></i>
            <span className="text-gray-800">{isRegistering ? '使用Google註冊' : '使用Google登入'}</span>
          </button>
        </div>
        
        <div className="text-center mt-4">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className={isRegistering ? "text-indigo-600 hover:text-indigo-800 font-medium underline px-4 py-2 rounded-lg text-base" : "signup-button"}
          >
            {isRegistering ? '已有帳號？點此登入' : '沒有帳號？點此註冊'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth; 