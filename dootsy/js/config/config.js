// Firebase config and initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


 const firebaseConfig = {
    apiKey: "AIzaSyBIJA3gp0fmWnxgN2I-bSr697BevwTQ7Q8",
    authDomain: "dootsy-6eea0.firebaseapp.com",
    projectId: "dootsy-6eea0",
    storageBucket: "dootsy-6eea0.firebasestorage.app",
    messagingSenderId: "1051715243309",
    appId: "1:1051715243309:web:65003376a1430f747817a4",
    measurementId: "G-K2L3TLLJ6R"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
