export const sortedCopy = <T>(
  values: readonly T[],
  compare: (left: T, right: T) => number
): T[] => {
  const sorted = [...values];

  for (let index = 1; index < sorted.length; index += 1) {
    const value = sorted[index];
    if (value === undefined) {
      continue;
    }

    let position = index;
    while (position > 0) {
      const previous = sorted[position - 1];
      if (previous === undefined || compare(previous, value) <= 0) {
        break;
      }
      sorted[position] = previous;
      position -= 1;
    }
    sorted[position] = value;
  }

  return sorted;
};

export const sortedStrings = (values: readonly string[]): string[] =>
  sortedCopy(values, (left, right) => left.localeCompare(right));
