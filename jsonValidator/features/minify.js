import { showMessage } from "./utils.js";
import { updateLineNumbers } from "./lineNumbers.js";
import { highlightErrorLine, clearHighlight } from "./highlight.js";
import { refreshStats } from './analytics.js';

export function initMinifier() {
  const input = document.getElementById("jsonInput");
  const minifyBtn = document.getElementById("minifyBtn");

  minifyBtn.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(input.value);
      input.value = JSON.stringify(parsed);
      updateLineNumbers();
      clearHighlight(input); // remove any previous highlight
          refreshStats();
      showMessage("JSON minified successfully ✅", "success");
    } catch (err) {
      highlightErrorLine(input, err);
      showMessage("Invalid JSON: " + err.message, "error");
    }
  });
}
