import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCMDAPMM11XaaelGeHDBQtwjFsMrVaA8FU",
  authDomain: "cloud-todo-list-6116a.firebaseapp.com",
  projectId: "cloud-todo-list-6116a",
  storageBucket: "cloud-todo-list-6116a.firebasestorage.app",
  messagingSenderId: "197606621526",
  appId: "1:197606621526:web:abf2eed686b46ce605d6f7",
  measurementId: "G-QYFGMBFXMH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;

try {
  analytics = getAnalytics(app);
} catch (error) {
  console.error("Analytics initialization failed:", error);
}

// Initialize Firestore
const db = getFirestore(app);
// Initialize Firebase Auth
const auth = getAuth(app);
auth.languageCode = 'zh-TW'; // 設置為繁體中文

// Google Sign In
const googleProvider = new GoogleAuthProvider();
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  }
};

// Email Registration
const registerWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Email registration error:", error);
    throw error;
  }
};

// Email Login
const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    console.error("Email login error:", error);
    throw error;
  }
};

// Logout
const logout = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

// Task type definition
export interface TaskData {
  id?: string;
  title: string;
  completed: boolean;
  userId: string;
  startDate: Timestamp | null;
  dueDate: Timestamp | null;
  category?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Add a task
const addTask = async (task: Omit<TaskData, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

// Get tasks for a user
const getTasks = async (userId: string) => {
  try {
    const q = query(
      collection(db, "tasks"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const tasks: TaskData[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      tasks.push({ 
        id: doc.id, 
        title: data.title,
        completed: data.completed,
        userId: data.userId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        category: data.category,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });
    return tasks;
  } catch (error) {
    console.error("Error getting tasks:", error);
    throw error;
  }
};

// Update a task
const updateTask = async (taskId: string, updateData: Partial<TaskData>) => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

// Delete a task
const deleteTask = async (taskId: string) => {
  try {
    await deleteDoc(doc(db, "tasks", taskId));
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};

export {
  app,
  auth,
  db,
  signInWithGoogle,
  registerWithEmail,
  loginWithEmail,
  logout,
  addTask,
  getTasks,
  updateTask,
  deleteTask
};