import { loadPage } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const routes = {
    viewMed: "view-medicine.html",
    addMed: "add-medicine.html",
  };

  Object.keys(routes).forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        loadPage(routes[id]);
      });
    }
  });
});
