export function showAlert(message, type = "info") {
  const colors = {
    info: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700"
  };
  
  const alert = document.createElement("div");
  alert.className = `p-3 rounded my-2 ${colors[type]} text-sm`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => alert.remove(), 3000);
}
