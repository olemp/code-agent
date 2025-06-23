/**
 * Limit the string to provided max length.
 * 
 * @param str The string
 * @param maxLength Max length
 */
export const truncate = (str: string, maxLength: number) => {
    return str.length <= maxLength ? str : str.substring(0, maxLength - 1) + "..."
}