export function highlightErrorLine(textarea, error) {
  clearHighlight(textarea); // reset previous highlights

  const match = error.message.match(/at position (\d+)/);
  if (!match) return;

  const pos = parseInt(match[1], 10);
  const lines = textarea.value.slice(0, pos).split("\n");
  const lineNum = lines.length;

  const lineStartIndex = lines.slice(0, -1).join("\n").length + (lines.length > 1 ? 1 : 0);
  const lineEndIndex = lineStartIndex + lines[lines.length - 1].length;

  textarea.focus();
  textarea.setSelectionRange(lineStartIndex, lineEndIndex); // highlight the error line
}

export function clearHighlight(textarea) {
  textarea.setSelectionRange(0, 0); // remove selection
}
