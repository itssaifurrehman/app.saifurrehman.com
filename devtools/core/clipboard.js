// devtools/core/clipboard.js
import { toast } from "./toast.js";

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard", "success");
  } catch (err) {
    toast(`Copy failed: ${err.message}`, "error");
  }
}
