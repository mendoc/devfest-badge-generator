// Text Utilities - Shared text rendering functions
// Centralizes text helpers used by badge-renderer.js, template-editor.js, and pdf-generator.js

function capitalize(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function removeAccents(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Split text into lines that fit within maxWidth (pixels) or maxChars.
 * @param {CanvasRenderingContext2D} canvasCtx - Canvas context used for text measurement
 * @param {string} text
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {number|null} maxChars - Maximum characters per line (null = unlimited)
 * @returns {string[]} Array of lines
 */
function splitTextToFit(canvasCtx, text, maxWidth, maxChars = null) {
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const words = cleanText.split(' ').filter(word => word.length > 0);

    if (words.length === 0) return [];

    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const exceedsWidth = canvasCtx.measureText(testLine).width > maxWidth;
        const exceedsChars = maxChars && testLine.length > maxChars;

        if (exceedsWidth || exceedsChars) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

/**
 * Draw multiline text on a canvas context.
 * @param {CanvasRenderingContext2D} canvasCtx - Canvas context to draw on
 * @param {string} text
 * @param {number} x - Left position in pixels
 * @param {number} startY - Top position of the first line in pixels
 * @param {number} lineHeight - Pixels between lines
 * @param {number} maxWidth - Maximum line width in pixels
 * @param {number|null} maxChars - Maximum characters per line (null = unlimited)
 * @returns {number} Y position after the last line
 */
function drawMultilineText(canvasCtx, text, x, startY, lineHeight, maxWidth, maxChars = null) {
    const lines = splitTextToFit(canvasCtx, text, maxWidth, maxChars);
    let currentY = startY;
    lines.forEach(line => {
        canvasCtx.fillText(line, x, currentY);
        currentY += lineHeight;
    });
    return currentY;
}
