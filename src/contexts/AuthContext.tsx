import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, AuthError } from 'firebase/auth';
import { auth } from '../firebase';

// 定義上下文類型
interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  authError: string | null;
}

// 創建上下文
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  isLoading: true,
  authError: null
});

// 導出自定義鉤子以便於使用
export const useAuth = () => useContext(AuthContext);

// 提供程序組件
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // 監聽身份驗證狀態變化
    setIsLoading(true);
    
    try {
      const unsubscribe = onAuthStateChanged(
        auth, 
        (user) => {
          setCurrentUser(user);
          setIsLoading(false);
          setAuthError(null);
        },
        (error) => {
          console.error("Auth state error:", error);
          
          // 處理特定錯誤代碼
          const firebaseError = error as { code?: string, message: string };
          if (firebaseError.code === 'auth/configuration-not-found') {
            setAuthError('Firebase 認證配置錯誤');
          } else if (firebaseError.code === 'auth/invalid-api-key') {
            setAuthError('Firebase API 密鑰無效');
          } else {
            setAuthError(error.message);
          }
          
          setIsLoading(false);
        }
      );

      // 清理訂閱
      return unsubscribe;
    } catch (error: any) {
      console.error("Auth setup error:", error);
      
      // 處理特定錯誤代碼
      const firebaseError = error as { code?: string, message: string };
      if (firebaseError.code === 'auth/configuration-not-found') {
        setAuthError('Firebase 認證配置錯誤');
      } else if (firebaseError.code === 'auth/invalid-api-key') {
        setAuthError('Firebase API 密鑰無效');
      } else {
        setAuthError(error.message);
      }
      
      setIsLoading(false);
      return () => {};
    }
  }, []);

  const value = {
    currentUser,
    isLoading,
    authError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 