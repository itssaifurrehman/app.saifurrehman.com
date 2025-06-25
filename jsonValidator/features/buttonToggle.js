import { detectFormat } from "./formatDetector.js";

export function initButtonToggler(state) {
  const input = document.getElementById("jsonInput");

  const buttons = {
    toJson: document.getElementById("toJsonBtn"),
    toYaml: document.getElementById("toYamlBtn"),
    toXml: document.getElementById("toXmlBtn"),
    format: document.getElementById("formatBtn"),
    validate: document.getElementById("validateBtn"),
    minify: document.getElementById("minifyBtn"),
    copy: document.getElementById("copyBtn"),
    download: document.getElementById("downloadBtn"),
  };

  function disableAll() {
    Object.values(buttons).forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    });
  }

  function enableRelevantButtons(format) {
    if (!format) return;

    buttons.copy.disabled = false;
    buttons.download.disabled = false;

    const isJSON = format === "json";
    const isYAML = format === "yaml";
    const isXML = format === "xml";

    buttons.toJson.disabled = isJSON;
    buttons.toYaml.disabled = isYAML;
    buttons.toXml.disabled = isXML;

    buttons.format.disabled = !isJSON;
    buttons.validate.disabled = !isJSON;
    buttons.minify.disabled = !isJSON;

    for (const key in buttons) {
      const btn = buttons[key];
      if (!btn) continue;
      if (btn.disabled) {
        btn.classList.add("opacity-50", "cursor-not-allowed");
      } else {
        btn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  }

  input.addEventListener("input", () => {
    if (state.locked) return;
    const format = state.format = detectFormat(input.value.trim());
    disableAll();
    if (format) enableRelevantButtons(format);
  });

  // On load, disable all by default
  disableAll();
}
