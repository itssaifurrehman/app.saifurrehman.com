import { login, logout, onAuthChange, handleRedirectLogin } from '../auth/auth.js';
import { setUser, getTasks } from "./todo.js";
import {
  renderTasks,
  bindTaskEvents,
  setupSortable,
  setupThemeToggle,
  updateEmptyState,
} from "./ui.js";

// UI Elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const plannerApp = document.getElementById("plannerApp");
const authSection = document.getElementById("authSection");

// Unified UI logic
async function showAppUI(user) {
  setUser(user.uid);
  authSection.classList.add("hidden");
  plannerApp.classList.remove("hidden");

  const tasks = await getTasks();
  renderTasks(tasks);
  updateEmptyState();
}

// Handle login button
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

// ✅ FIRST: handle redirect login (mobile)
await handleRedirectLogin(async (user) => {
  if (user) {
    await showAppUI(user);
  }
});

// ✅ THEN: listen for auth state changes
onAuthChange(async (user) => {
  if (user) {
    await showAppUI(user);
  } else {
    plannerApp.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
});

// Setup UI/UX features
setupThemeToggle();
bindTaskEvents();
setupSortable();
