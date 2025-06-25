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
  };

  function updateButtonStates() {
    if (state.locked) return;

    const format = state.format = detectFormat(input.value.trim());

    const isJSON = format === "json";
    const isYAML = format === "yaml";
    const isXML = format === "xml";

    buttons.format.disabled = !isJSON;
    buttons.validate.disabled = !isJSON;
    buttons.minify.disabled = !isJSON;

    buttons.toJson.disabled = isJSON;
    buttons.toYaml.disabled = isYAML;
    buttons.toXml.disabled = isXML;

    for (const key in buttons) {
      const btn = buttons[key];
      if (btn) {
        if (btn.disabled) {
          btn.classList.add("opacity-50", "cursor-not-allowed");
        } else {
          btn.classList.remove("opacity-50", "cursor-not-allowed");
        }
      }
    }
  }

  input.addEventListener("input", updateButtonStates);
  updateButtonStates();
}
