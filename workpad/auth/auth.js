import { auth, provider } from "../config/config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userNameSpan = document.getElementById("userName");

let user = null;

const login = () => signInWithPopup(auth, provider);

const logout = () => signOut(auth);

const onUserChange = (callback) => {
  onAuthStateChanged(auth, (u) => {
    user = u;

    // Update UI based on auth state
    if (user) {
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");

      const name = user.displayName || user.email;
      userNameSpan.textContent = `👋 Hello, ${name}`;
      userNameSpan.classList.remove("hidden");
    } else {
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");

      userNameSpan.textContent = "";
      userNameSpan.classList.add("hidden");
    }

    callback(user); // Notify app
  });
};

const getUser = () => user;

export { login, logout, onUserChange, getUser };
