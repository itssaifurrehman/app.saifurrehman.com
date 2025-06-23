import { login, logout, onAuthChange } from '../auth/auth.js';
import { setUser, getTasks, addTask } from './todo.js';
import { renderTasks, bindTaskEvents, setupSortable, setupThemeToggle } from './ui.js';

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const plannerApp = document.getElementById("plannerApp");
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");

loginBtn.onclick = () => login();
logoutBtn.onclick = () => logout();

addBtn.onclick = async () => {
  const text = taskInput.value.trim();
  if (!text) return;

  const tasks = await getTasks();
  const order = tasks.length;

  const docRef = await addTask(text, order);
  const newTasks = await getTasks();
  renderTasks(newTasks);
  taskInput.value = "";
};

onAuthChange(async (user) => {
  if (user) {
    setUser(user.uid);
    document.getElementById("authSection").classList.add("hidden");
    plannerApp.classList.remove("hidden");
    const tasks = await getTasks();
    renderTasks(tasks);
  } else {
    plannerApp.classList.add("hidden");
    document.getElementById("authSection").classList.remove("hidden");
  }
});

setupThemeToggle();
bindTaskEvents();
setupSortable();
