import jsyaml from "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm";

let input;
let stateRef = null;

export function initAnalytics(state) {
  stateRef = state;
  input = document.getElementById("jsonInput");
  if (!input) return;

  input.addEventListener("input", updateStats);
  updateStats();
}

function updateStats() {
  setTimeout(() => {
    const statsBox = document.getElementById("jsonStats");
  if (!statsBox) return;

  const value = input.value.trim();

  if (value === "") {
    statsBox.innerHTML = "";
    return;
  }

  let parsed;

  try {
    if (stateRef.format === "json") {
      parsed = JSON.parse(value);
    } else if (stateRef.format === "yaml") {
      parsed = jsyaml.load(value);
    } else if (stateRef.format === "xml") {
      const parser = new DOMParser();
      const xml = parser.parseFromString(value, "application/xml");
      if (xml.getElementsByTagName("parsererror").length === 0) {
        parsed = xmlToJson(xml);
      } else {
        throw new Error("Invalid XML");
      }
    } else {
      throw new Error("Unknown format");
    }

    const lines = value.split("\n").length;
    const chars = value.length;
    const keys = countKeys(parsed);
    const types = countTypes(parsed);

    statsBox.innerHTML = `
      <div class="mb-1">📏 <strong>Lines:</strong> ${lines} | 🅰️ <strong>Characters:</strong> ${chars} | 🔑 <strong>Keys:</strong> ${keys} | 
      📦 <strong>Objects:</strong> ${types.object}  | 📚 <strong>Arrays:</strong> ${types.array} | 🔤 <strong>Strings:</strong> ${types.string} | 🔢 <strong>Numbers:</strong> ${types.number} | ✅ <strong>Booleans:</strong> ${types.boolean} | ❌ <strong>Nulls:</strong> ${types.null}</div>
    `;
  } catch {
    statsBox.innerHTML = `<span class="text-red-500">⚠️ Stats unavailable for invalid ${stateRef.format.toUpperCase()}</span>`;
  }
  }, 0);
  
}

// Helper: Convert XML to JSON-like structure
function xmlToJson(xml) {
  const obj = {};
  function recurse(node, obj) {
    if (node.nodeType === 1) {
      const nodeName = node.nodeName;
      if (!obj[nodeName]) {
        obj[nodeName] = {};
      }
      const children = Array.from(node.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue.trim()));
      if (children.length === 0) {
        obj[nodeName] = node.textContent;
      } else {
        children.forEach(child => {
          recurse(child, obj[nodeName]);
        });
      }
    }
  }
  recurse(xml.documentElement, obj);
  return obj;
}

// Helper: Count keys recursively
function countKeys(obj) {
  if (typeof obj !== "object" || obj === null) return 0;
  let count = 0;
  for (const key in obj) {
    count += 1 + countKeys(obj[key]);
  }
  return count;
}

// Helper: Count value types
function countTypes(obj) {
  const counts = {
    object: 0,
    array: 0,
    string: 0,
    number: 0,
    boolean: 0,
    null: 0,
  };

  function walk(value) {
    if (Array.isArray(value)) {
      counts.array++;
      value.forEach(walk);
    } else if (value === null) {
      counts.null++;
    } else if (typeof value === "object") {
      counts.object++;
      Object.values(value).forEach(walk);
    } else {
      counts[typeof value]++;
    }
  }

  walk(obj);
  return counts;
}

// Optional: manual refresh
export function refreshStats() {
  updateStats();
}
