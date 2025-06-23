import { login, logout, onAuthChange } from "../auth/auth.js";
import { setUser, getTasks, addTask } from "./todo.js";
import {
  renderTasks,
  bindTaskEvents,
  setupSortable,
  setupThemeToggle,
  updateEmptyState,
} from "./ui.js";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const plannerApp = document.getElementById("plannerApp");

loginBtn.onclick = () => login();
logoutBtn.onclick = () => logout();

onAuthChange(async (user) => {
  if (user) {
    setUser(user.uid);
    document.getElementById("authSection").classList.add("hidden");
    plannerApp.classList.remove("hidden");
    const tasks = await getTasks();
    renderTasks(tasks);
    updateEmptyState();
  } else {
    plannerApp.classList.add("hidden");
    document.getElementById("authSection").classList.remove("hidden");
  }
});

setupThemeToggle();
bindTaskEvents();
setupSortable();