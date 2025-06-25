export function detectFormat(text) {
  try {
    JSON.parse(text);
    return "json";
  } catch {}

  try {
    jsyaml.load(text);
    return "yaml";
  } catch {}

  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "application/xml");
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (!parseError.length) return "xml";
  } catch {}

  return "invalid";
}
