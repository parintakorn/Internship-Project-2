import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBm1DBPD7zyBN0-JZISfQpK044ploaxeoM",
  authDomain: "biguri-shop.firebaseapp.com",
  projectId: "biguri-shop",
  storageBucket: "biguri-shop.firebasestorage.app",
  messagingSenderId: "284452399116",
  appId: "1:284452399116:web:e2586b843f57557c0c6629",
  measurementId: "G-22VRM4LKCP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
