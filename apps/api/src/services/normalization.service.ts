export type NormalizedText = {
  text: string;
  sourceOffsets: readonly number[];
};

/**
 * Normalizes whitespace while retaining a mapping from every normalized
 * character back to its position in the original resource content.
 */
export function normalizeText(source: string): NormalizedText {
  const characters: string[] = [];
  const sourceOffsets: number[] = [];
  let previousWasWhitespace = true;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === undefined) {
      continue;
    }

    if (/\s/.test(character)) {
      if (!previousWasWhitespace) {
        characters.push(' ');
        sourceOffsets.push(index);
      }
      previousWasWhitespace = true;
      continue;
    }

    characters.push(character);
    sourceOffsets.push(index);
    previousWasWhitespace = false;
  }

  while (characters.at(-1) === ' ') {
    characters.pop();
    sourceOffsets.pop();
  }

  return {
    text: characters.join(''),
    sourceOffsets,
  };
}
