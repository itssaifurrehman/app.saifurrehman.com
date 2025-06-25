import { showMessage } from './utils.js';

export function initClipboard() {
  const input = document.getElementById("jsonInput");
  const copyBtn = document.getElementById("copyBtn");

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(input.value);
      showMessage("Copied to clipboard 📋", "success");
    } catch {
      showMessage("Failed to copy", "error");
    }
  });
}
