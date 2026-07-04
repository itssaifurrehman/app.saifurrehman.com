// devtools/core/toast.js
// Renders into the #toast element owned by the shell. Errors persist until
// the next toast or route change; success/info auto-hide.
const KIND_CLASSES = {
  info: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};
let timer;

export function toast(message, kind = "info") {
  const box = document.getElementById("toast");
  if (!box) return;
  box.textContent = message;
  box.className =
    "mx-4 md:mx-6 mt-3 px-4 py-2 rounded-md text-sm font-medium " +
    (KIND_CLASSES[kind] || KIND_CLASSES.info);
  clearTimeout(timer);
  if (kind !== "error") timer = setTimeout(hideToast, 3000);
}

export function hideToast() {
  const box = document.getElementById("toast");
  if (!box) return;
  box.textContent = "";
  box.className = "hidden";
}
