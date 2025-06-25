import { showMessage } from './utils.js';
import { updateLineNumbers } from './lineNumbers.js';
import { refreshStats } from './analytics.js';

export function initFormatter() {
  const input = document.getElementById("jsonInput");
  const formatBtn = document.getElementById("formatBtn");

  formatBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(input.value);
      input.value = JSON.stringify(parsed, null, 2);
      updateLineNumbers(); // normal update
          refreshStats();
      showMessage("JSON formatted successfully ✅", "success");
    } catch (err) {
      const errorLine = getErrorLine(input.value, err.message);
      updateLineNumbers(errorLine); // pass in line with error
      showMessage("Invalid JSON: " + err.message, "error");
    }
  });
}
