import { showMessage } from "./utils.js";
import { updateLineNumbers } from "./lineNumbers.js";

import jsyaml from "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm";
import { XMLBuilder } from "https://cdn.jsdelivr.net/npm/fast-xml-parser@4.3.5/+esm";

export function initConverters(state) {
  const input = document.getElementById("jsonInput");
  const jsonBtn = document.getElementById("toJsonBtn");
  const yamlBtn = document.getElementById("toYamlBtn");
  const xmlBtn = document.getElementById("toXmlBtn");

  function triggerInput() {
    input.dispatchEvent(new Event("input"));
  }

  function parseInputValue() {
    const text = input.value.trim();

    try {
      const json = JSON.parse(text);
      state.format = "json";
      return { data: json, format: "json" };
    } catch {}

    try {
      const yaml = jsyaml.load(text);
      state.format = "yaml";
      return { data: yaml, format: "yaml" };
    } catch {}

    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const errorNode = xml.getElementsByTagName("parsererror");
      if (errorNode.length === 0) {
        const json = xmlToJson(xml);
        state.format = "xml";
        return { data: json, format: "xml" };
      }
    } catch {}

    throw new Error("Unrecognized or invalid format");
  }

  function xmlToJson(xml) {
    showMessage("⚠️ XML to JSON conversion may lose structure or type info", "error");
    const obj = {};
    function recurse(node, target) {
      if (node.nodeType === 1) {
        const name = node.nodeName;
        if (!target[name]) {
          target[name] = {};
        }

        const children = Array.from(node.childNodes).filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && n.nodeValue.trim())
        );

        if (children.length === 0) {
          target[name] = node.textContent;
        } else {
          children.forEach((child) => {
            recurse(child, target[name]);
          });
        }
      }
    }
    recurse(xml.documentElement, obj);
    return obj;
  }

  function lockFormat(type) {
    state.format = type;
    state.locked = true;
    setTimeout(() => (state.locked = false), 300);
  }

  jsonBtn.addEventListener("click", () => {
    try {
      const { data, format } = parseInputValue();
      console.log("Converting to JSON from:", format);

      if (format === "xml" || format === "yaml") {
        showMessage("⚠️ Converting from XML may produce incomplete JSON", "warning");
      }

      input.value = JSON.stringify(data, null, 2);
      updateLineNumbers();
      triggerInput();
      lockFormat("json");
      showMessage("Converted to JSON ✅", "success");
    } catch (err) {
      input.value = `⚠️ ${err.message}`;
      state.format = "error";
      showMessage("Conversion to JSON failed ❌", "error");
    }
  });

  yamlBtn.addEventListener("click", () => {
    try {
      const { data, format } = parseInputValue();
      console.log("Converting to YAML from:", format);

      if (format === "xml") {
        showMessage("⚠️ XML-derived JSON may not be valid YAML", "warning");
      }

      input.value = jsyaml.dump(data);
      updateLineNumbers();
      triggerInput();
      lockFormat("yaml");
      showMessage("Converted to YAML ✅", "success");
    } catch (err) {
      input.value = `⚠️ ${err.message}`;
      state.format = "error";
      showMessage("Conversion to YAML failed ❌", "error");
    }
  });

  xmlBtn.addEventListener("click", () => {
    try {
      const { data, format } = parseInputValue();
            console.log("Converting to JSXML from:", format);


      const wrapped = Array.isArray(data) ? { root: { item: data } } : data;

      const builder = new XMLBuilder({
        format: true,
        indentBy: "  ",
        ignoreAttributes: false,
        suppressEmptyNode: true,
      });

      const xmlString = builder.build(wrapped);

      // Validate XML output
      const parser = new DOMParser();
      const testDoc = parser.parseFromString(xmlString, "application/xml");
      const errorTags = testDoc.getElementsByTagName("parsererror");
      if (errorTags.length > 0) {
        throw new Error("Generated XML is not well-formed");
      }

      input.value = xmlString;
      updateLineNumbers();
      triggerInput();
      lockFormat("xml");
      showMessage("Converted to XML ✅", "success");
    } catch (err) {
      input.value = `⚠️ ${err.message}`;
      state.format = "error";
      showMessage("Conversion to XML failed ❌", "error");
    }
  });
}
