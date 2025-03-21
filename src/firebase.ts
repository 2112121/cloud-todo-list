// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, orderBy, serverTimestamp, Timestamp, Firestore, writeBatch } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMDAPMM11XaaelGeHDBQtwjFsMrVaA8FU",
  authDomain: "cloud-todo-list-6116a.firebaseapp.com",
  projectId: "cloud-todo-list-6116a",
  storageBucket: "cloud-todo-list-6116a.firebasestorage.app",
  messagingSenderId: "197606621526",
  appId: "1:197606621526:web:abf2eed686b46ce605d6f7"
};

// 確保 Firebase 只初始化一次
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let analytics: Analytics | undefined;

try {
  // 初始化 Firebase
  app = initializeApp(firebaseConfig);
  
  // 初始化 Firestore 和 Auth
  db = getFirestore(app);
  auth = getAuth(app);
  
  // 設置語言為中文
  auth.languageCode = 'zh-TW';
  
  // 初始化分析（可選）
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("Analytics initialization failed:", error);
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

const googleProvider = new GoogleAuthProvider();

// Firebase認證函數
export const signInWithGoogle = async () => {
  if (!auth) throw new Error('認證服務未初始化');
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return user;
  } catch (error) {
    console.error("Google 登錄錯誤:", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, password: string, displayName: string) => {
  if (!auth) throw new Error('認證服務未初始化');
  
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // 更新用戶檔案
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    return user;
  } catch (error) {
    console.error("電子郵件註冊錯誤:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error('認證服務未初始化');
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("電子郵件登錄錯誤:", error);
    throw error;
  }
};

export const logoutUser = async () => {
  if (!auth) throw new Error('認證服務未初始化');
  
  try {
    await signOut(auth);
  } catch (error) {
    console.error("登出錯誤:", error);
    throw error;
  }
};

// 定義任務類型
interface TaskData {
  text: string;
  completed: boolean;
  dueDate: string;
  category: string;
  createdAt?: Date | Timestamp;
  [key: string]: any;
}

// 添加任務到 Firestore
export const addTaskToFirestore = async (userId: string, taskData: TaskData) => {
  if (!db) throw new Error('數據庫服務未初始化');
  
  try {
    const tasksCollection = collection(db, "users", userId, "tasks");
    const timestamp = serverTimestamp();
    const docRef = await addDoc(tasksCollection, {
      ...taskData,
      createdAt: timestamp
    });
    
    return {
      id: docRef.id,
      ...taskData
    };
  } catch (error) {
    console.error("添加任務錯誤:", error);
    throw error;
  }
};

// 從 Firestore 獲取用戶任務
export const getUserTasks = async (userId: string) => {
  if (!db) throw new Error('數據庫服務未初始化');
  
  try {
    // 嘗試從新路徑獲取任務
    const tasksCollection = collection(db, "users", userId, "tasks");
    const querySnapshot = await getDocs(tasksCollection);
    
    const tasks: Array<{id: string} & TaskData> = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
      
      tasks.push({
        id: doc.id,
        ...data,
        createdAt
      } as {id: string} & TaskData);
    });
    
    // 如果新路徑中沒有任務，嘗試從舊路徑查詢並遷移
    if (tasks.length === 0) {
      try {
        await migrateUserTasks(userId);
        // 遷移後重新獲取任務
        const newQuerySnapshot = await getDocs(tasksCollection);
        newQuerySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
          
          tasks.push({
            id: doc.id,
            ...data,
            createdAt
          } as {id: string} & TaskData);
        });
      } catch (migrationError) {
        console.error("任務遷移失敗:", migrationError);
        // 遷移失敗不阻止後續操作
      }
    }
    
    return tasks.sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
  } catch (error) {
    console.error("獲取任務錯誤:", error);
    throw error;
  }
};

// 遷移用戶任務從舊路徑到新路徑
export const migrateUserTasks = async (userId: string) => {
  if (!db) throw new Error('數據庫服務未初始化');
  
  try {
    console.log(`開始為用戶 ${userId} 遷移任務...`);
    
    // 查詢舊結構的任務
    const q = query(collection(db, "tasks"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`用戶 ${userId} 沒有需要遷移的任務`);
      return;
    }
    
    console.log(`找到 ${querySnapshot.size} 個需要遷移的任務`);
    
    // 遷移每個任務到新結構
    const batch = writeBatch(db);
    const targetCollection = collection(db, "users", userId, "tasks");
    
    querySnapshot.forEach((oldDoc) => {
      const data = oldDoc.data();
      const newDocRef = doc(targetCollection);
      
      // 複製數據到新路徑，但不包含 userId 字段
      const { userId: _, ...taskData } = data;
      batch.set(newDocRef, taskData);
      
      // 同時刪除舊數據
      batch.delete(oldDoc.ref);
    });
    
    // 提交批量更新
    await batch.commit();
    console.log(`成功遷移 ${querySnapshot.size} 個任務`);
    
    return querySnapshot.size;
  } catch (error) {
    console.error("任務遷移錯誤:", error);
    throw error;
  }
};

export const updateTaskInFirestore = async (taskId: string, updates: Partial<TaskData>) => {
  if (!db || !auth) throw new Error('服務未初始化');
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('用戶未登入');
    
    const taskRef = doc(db, "users", user.uid, "tasks", taskId);
    await updateDoc(taskRef, updates);
    return true;
  } catch (error) {
    console.error("更新任務錯誤:", error);
    throw error;
  }
};

export const deleteTaskFromFirestore = async (taskId: string) => {
  if (!db || !auth) throw new Error('服務未初始化');
  
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('用戶未登入');
    
    const taskRef = doc(db, "users", user.uid, "tasks", taskId);
    await deleteDoc(taskRef);
    return true;
  } catch (error) {
    console.error("刪除任務錯誤:", error);
    throw error;
  }
};

// 檢查 Firebase 認證設置是否已配置
export const checkFirebaseAuthConfig = async () => {
  if (!auth) return false;
  
  try {
    // 嘗試一個簡單的操作來檢查配置
    auth.languageCode = 'zh-TW';
    return true;
  } catch (error) {
    console.error('Firebase 認證配置檢查失敗:', error);
    return false;
  }
};

export { app, analytics, db, auth }; 