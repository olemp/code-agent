import * as core from '@actions/core';

/**
 * Helper function to parse comma-separated string into array.
 *
 * @param name Input name.
 * @param separator Separator to use for splitting the string.
 *
 * @returns string[] | null
 */
export function getStrArray(name: string, separator: string = ','): string[] | null {
  const input = core.getInput(name) ?? '';
  if (!input || !input.trim()) {
    return null;
  }
  const strArray = input.split(separator).map(pattern => pattern.trim()).filter(Boolean);
  return strArray.length > 0 ? strArray : null;
}
