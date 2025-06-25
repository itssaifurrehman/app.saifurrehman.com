import { showMessage } from "./utils.js";

export function initDownload(state) {
  const input = document.getElementById("jsonInput");
  const downloadBtn = document.getElementById("downloadBtn");

  downloadBtn.addEventListener("click", () => {
    try {
      const text = input.value.trim();

      let type = "application/json";
      let extension = "json";
      switch (state.format) {
        case "xml":
          type = "application/xml";
          extension = "xml";
          break;
        case "yaml":
          type = "text/yaml";
          extension = "yaml";
          break;

        case "json":
        default:
          type = "application/json";
          extension = "json";
          break;
      }

      const blob = new Blob([text], { type });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `converted.${extension}`;
      a.click();

      URL.revokeObjectURL(url);
      showMessage(`Download started 📥 (.${extension})`, "success");
    } catch {
      showMessage("Download failed ❌", "error");
    }
  });
}
