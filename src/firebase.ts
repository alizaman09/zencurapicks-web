import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAtNaQrBXpKzp7pUWlUbXJ0B7-IdZs5a8",
  authDomain: "zencurapicks-5c2bf.firebaseapp.com",
  projectId: "zencurapicks-5c2bf",
  storageBucket: "zencurapicks-5c2bf.appspot.com",
  messagingSenderId: "665138621279",
  appId: "1:665138621279:web:93cca168302d31bcce24ea",
  databaseURL: "https://zencurapicks-5c2bf-default-rtdb.firebaseio.com"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
