import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYL1NMaN3BCdgGjNEfAmD4XQiQn46L6eI",
  authDomain: "pointly-fecd1.firebaseapp.com",
  projectId: "pointly-fecd1",
  storageBucket: "pointly-fecd1.firebasestorage.app",
  messagingSenderId: "20849323537",
  appId: "1:20849323537:web:efecc22b203e3968650bb0",
  measurementId: "G-2RPMNV8RZ2",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
