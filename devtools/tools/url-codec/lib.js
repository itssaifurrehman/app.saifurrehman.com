// devtools/tools/url-codec/lib.js
export const encodeComponent = (text) => encodeURIComponent(text);
export const encodeUri = (text) => encodeURI(text);
export const decodeText = (text) => decodeURIComponent(text); // throws URIError on malformed input
