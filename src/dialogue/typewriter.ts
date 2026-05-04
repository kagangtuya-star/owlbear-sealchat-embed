function consumeEntity(html: string, startIndex: number): {
  value: string;
  nextIndex: number;
} {
  const entityEnd = html.indexOf(";", startIndex);

  if (entityEnd === -1) {
    return {
      value: html[startIndex] ?? "",
      nextIndex: startIndex + 1,
    };
  }

  return {
    value: html.slice(startIndex, entityEnd + 1),
    nextIndex: entityEnd + 1,
  };
}

function consumeTag(html: string, startIndex: number): {
  value: string;
  nextIndex: number;
} {
  const tagEnd = html.indexOf(">", startIndex);

  if (tagEnd === -1) {
    return {
      value: html[startIndex] ?? "",
      nextIndex: startIndex + 1,
    };
  }

  return {
    value: html.slice(startIndex, tagEnd + 1),
    nextIndex: tagEnd + 1,
  };
}

export function countVisibleCharacters(html: string): number {
  let index = 0;
  let visibleCount = 0;

  while (index < html.length) {
    const currentCharacter = html[index];

    if (currentCharacter === "<") {
      index = consumeTag(html, index).nextIndex;
      continue;
    }

    if (currentCharacter === "&") {
      index = consumeEntity(html, index).nextIndex;
      visibleCount += 1;
      continue;
    }

    index += 1;
    visibleCount += 1;
  }

  return visibleCount;
}

export function sliceHtmlByVisibleCharacters(
  html: string,
  visibleCharacters: number
): string {
  if (visibleCharacters <= 0) {
    return "";
  }

  let index = 0;
  let revealedCharacters = 0;
  let output = "";

  while (index < html.length && revealedCharacters < visibleCharacters) {
    const currentCharacter = html[index];

    if (currentCharacter === "<") {
      const tag = consumeTag(html, index);
      output += tag.value;
      index = tag.nextIndex;
      continue;
    }

    if (currentCharacter === "&") {
      const entity = consumeEntity(html, index);
      output += entity.value;
      index = entity.nextIndex;
      revealedCharacters += 1;
      continue;
    }

    output += currentCharacter;
    index += 1;
    revealedCharacters += 1;
  }

  return output;
}
