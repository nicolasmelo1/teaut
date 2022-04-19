import hexToRgb from "./hexToRGB"

/**
 * Checks if the best color to use in the text is black or white depending on the background color.
 * 
 * Actually Github copilot gave us this function. But you can find a nice explanation here: 
 * https://stackoverflow.com/a/3943023
 * 
 * As you can see the threshold we use is 128, it's good enough for our use case.
 * 
 * @param {string} backgroundHexColor - Hex color of the background.
 * 
 * @returns {'black' | 'white' | null} - Hex color of the text to use, should be white, black or if null
 * use the default value you got.
 */
export default function whiteOrBlackColor(backgroundHexColor) {
    if (typeof backgroundHexColor === "string") { 
        const rgbColor = hexToRgb(backgroundHexColor)
        if (rgbColor !== null) {
            const { r, g, b } = rgbColor
            const yiq = (r * 299 + g * 587 + b * 114) / 1000
            return yiq >= 128 ? "black" : "white"
        } 
    }
    return null
}