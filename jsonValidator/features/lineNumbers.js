let input, lineNumbers;

export function initLineNumbers() {
  input = document.getElementById("jsonInput");
  lineNumbers = document.getElementById("lineNumbers");

  if (!input || !lineNumbers) return;

  input.addEventListener("input", updateLineNumbers);
  input.addEventListener("scroll", syncScroll);

  updateLineNumbers();
}

export function updateLineNumbers() {
  if (!input || !lineNumbers) return;

  const lines = input.value.split("\n").length;
  const lineNums = Array.from({ length: lines }, (_, i) => i + 1).join("\n");
  lineNumbers.textContent = lineNums;
}

function syncScroll() {
  lineNumbers.scrollTop = input.scrollTop;
}
