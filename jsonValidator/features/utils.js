let messageTimeout;

export function showMessage(msg, type = "success") {
  const message = document.getElementById("message");

  // Set text and color
  message.textContent = msg;
  message.className = `mt-4 text-center text-sm font-semibold ${
    type === "success" ? "text-green-600" : "text-red-600"
  }`;

  // Clear previous timeout if exists
  clearTimeout(messageTimeout);

  // Auto-clear after 5 seconds
  messageTimeout = setTimeout(() => {
    message.textContent = "";
    message.className = "mt-4 text-center text-sm font-medium";
  }, 3000);
}
