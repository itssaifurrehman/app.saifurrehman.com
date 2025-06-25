import { showMessage } from './utils.js';

export function initValidator() {
  const input = document.getElementById("jsonInput");
  const validateBtn = document.getElementById("validateBtn");

  validateBtn.addEventListener("click", () => {
    try {
      JSON.parse(input.value);
      showMessage("Valid JSON ✅", "success");
    } catch (err) {
      showMessage("Invalid JSON: " + err.message, "error");
    }
  });
}
