// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase 配置（使用您自己的配置）
const firebaseConfig = {
  apiKey: "AIzaSyCMDAPMM11XaaelGeHDBQtwjFsMrVaA8FU", // 使用您的 API 密鑰
  authDomain: "cloud-todo-list-6116a.firebaseapp.com", // 使用您的 Auth 域
  projectId: "cloud-todo-list-6116a", // 使用您的 Project ID
  storageBucket: "cloud-todo-list-6116a.firebasestorage.app", // 使用您的 Storage 桶
  messagingSenderId: "197606621526", // 使用您的 Sender ID
  appId: "1:197606621526:web:abf2eed686b46ce605d6f7", // 使用您的 App ID
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
// 初始化 Firestore
const db = getFirestore(app);

// 導出 db 供其他檔案使用
export { db };
