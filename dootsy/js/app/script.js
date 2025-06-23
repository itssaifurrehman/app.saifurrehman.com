import {
  login,
  logout,
  onAuthChange,
  handleRedirectLogin,
} from "../auth/auth.js";
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

// Unified logic to show planner UI
async function showAppUI(user) {
  setUser(user.uid);
  authSection.classList.add("hidden");
  plannerApp.classList.remove("hidden");

  const tasks = await getTasks();
  renderTasks(tasks);
  updateEmptyState();
}

// Handle login button click
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

// Handle redirect login (mobile)
handleRedirectLogin(async (user) => {
  if (user) {
    console.log("Logged in via redirect:", user.displayName);
    await showAppUI(user);
  }
});

// Handle auth state changes (desktop login, auto-login)
onAuthChange(async (user) => {
  if (user) {
    await showAppUI(user);
  } else {
    plannerApp.classList.add("hidden");
    authSection.classList.remove("hidden");
  }
});

// Setup features
setupThemeToggle();
bindTaskEvents();
setupSortable();
