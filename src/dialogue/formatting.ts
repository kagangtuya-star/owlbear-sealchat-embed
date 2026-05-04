function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeHtmlEntities(value: string): string {
  if (typeof document === "undefined") {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function restoreEscapedWhitespace(value: string): string {
  return escapeHtml(decodeHtmlEntities(value))
    .replace(/\r?\n/g, "<br>")
    .replace(/\\n/g, "<br>")
    .replace(/\\t/g, "&emsp;&emsp;")
    .replace(/\\T/g, "&emsp;&emsp;&emsp;&emsp;")
    .replace(/\\&#39;/g, "'")
    .replace(/\\&quot;/g, '"')
    .replace(/\\\\/g, "\\");
}

export function normalizeDialoguePages(message: string): string[] {
  return message.split("::").map(restoreEscapedWhitespace);
}
