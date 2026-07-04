// devtools/registry.js
// Single source of truth for tools. Adding a tool = add an entry here +
// create devtools/tools/<slug>/tool.js. Nothing else changes.
export const CATEGORIES = ["Backend & API", "Text & Data", "Frontend & CSS"];

export const TOOLS = [
  { slug: "json-formatter", name: "JSON Formatter", icon: "🧰", category: "Text & Data",
    description: "Format, validate, minify and convert JSON, YAML and XML." },
  { slug: "jwt", name: "JWT Decode & Sign", icon: "🔏", category: "Backend & API",
    description: "Decode, verify and sign JSON Web Tokens — entirely in your browser." },
  { slug: "base64", name: "Base64", icon: "🔡", category: "Backend & API",
    description: "UTF-8-safe Base64 encode and decode." },
  { slug: "url-codec", name: "URL Encode/Decode", icon: "🔗", category: "Backend & API",
    description: "Encode or decode URL components and full URIs." },
  { slug: "uuid", name: "UUID Generator", icon: "🆔", category: "Backend & API",
    description: "Generate v4 UUIDs, one or in bulk." },
  { slug: "hash", name: "Hash Generator", icon: "#️⃣", category: "Backend & API",
    description: "SHA-1, SHA-256 and SHA-512 digests via WebCrypto." },
  { slug: "timestamp", name: "Timestamp Converter", icon: "⏱️", category: "Backend & API",
    description: "Epoch ↔ human dates, with live clock and relative time." },
  { slug: "case-converter", name: "Case Converter", icon: "🔀", category: "Text & Data",
    description: "camelCase, PascalCase, snake_case, kebab-case, Title Case." },
  { slug: "query-string", name: "Query String Parser", icon: "❓", category: "Backend & API",
    description: "Parse URL query strings into a table and JSON." },
];
