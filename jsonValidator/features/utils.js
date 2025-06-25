let messageTimeout;

export function showMessage(msg, type = "success") {
  const message = document.getElementById("message");

  // Set text and color class based on type
  let colorClass = "text-green-600"; // default to success
  if (type === "error") colorClass = "text-red-600";
  else if (type === "warning") colorClass = "text-yellow-600";

  // Apply content and class
  message.textContent = msg;
  message.className = `mt-4 text-center text-sm font-semibold ${colorClass}`;

  // Clear previous timeout
  clearTimeout(messageTimeout);

  // Auto-clear after 3 seconds
  messageTimeout = setTimeout(() => {
    message.textContent = "";
    message.className = "mt-4 text-center text-sm font-medium";
  }, 3000);
}
