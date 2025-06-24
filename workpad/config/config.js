import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUKTxIEEgE9sKTvcUTbgU7obRKT2YHb_w",
  authDomain: "workpad-3c3eb.firebaseapp.com",
  projectId: "workpad-3c3eb",
  storageBucket: "workpad-3c3eb.firebasestorage.app",
  messagingSenderId: "402036745617",
  appId: "1:402036745617:web:c4b953cc97eee8eb742630",
  measurementId: "G-EE28QLE0GC",
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };
