import { initLineNumbers } from "./features/lineNumbers.js";
import { initFormatter } from "./features/formatter.js";
import { initValidator } from "./features/validator.js";
import { initClipboard } from "./features/clipboard.js";
import { initDownload } from "./features/download.js";
import { initMinifier } from "./features/minify.js";
import { initAnalytics } from "./features/analytics.js";
import { initConverters } from "./features/converters.js";
import { initButtonToggler } from "./features/buttonToggle.js";

const state = { format: "json" };

window.addEventListener("DOMContentLoaded", () => {
  initFormatter();
  initValidator();
  initClipboard();
  initMinifier();
  initLineNumbers();
  initAnalytics(state);
  initConverters(state);
  initDownload(state);
  initButtonToggler(state);
});
