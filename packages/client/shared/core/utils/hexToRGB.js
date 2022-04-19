/**
 * Convert a hex color to an RGB color.
 * 
 * Reference:
 * https://stackoverflow.com/a/5624139 (it's the updated answer from December 2012)
 * 
 * @param {String} hex - Hex color to convert
 * 
 * @returns {{r: number, g: number, b: number} | null} - RGB color
 */
export default function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
    hex = hex.replace(shorthandRegex, function(match, red, green, blue) {
        return red + red + green + green + blue + blue
    })
  
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}