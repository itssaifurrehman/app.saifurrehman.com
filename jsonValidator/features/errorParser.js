export function getErrorLine(content, errorMessage) {
  const match = errorMessage.match(/at position (\d+)/);
  if (!match) return null;

  const pos = parseInt(match[1], 10);
  const linesBefore = content.slice(0, pos).split("\n");
  return linesBefore.length;
}
