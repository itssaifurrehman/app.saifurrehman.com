// js/app.js
import { checkAuth, logoutUser, initGoogleLogin } from './js/auth/auth.js';
import { initProductForm, renderProducts } from './js/features/products.js';

const path = window.location.pathname;

// Auth check for all pages (except login)
if (!path.endsWith('index.html')) {
  checkAuth();
}

// Route: Login
if (path.endsWith('index.html')) {
  initGoogleLogin();
}

// Route: Dashboard
if (path.endsWith('dashboard.html')) {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
  }
}

// Route: Products
if (path.endsWith('products.html')) {
  initProductForm();
  renderProducts();
}
