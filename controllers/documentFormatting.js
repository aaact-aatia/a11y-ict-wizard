const { JSDOM } = require('jsdom');

/*
 * Applies the small HTML adjustments needed before html-docx-js converts a
 * generated document. This module deliberately preserves source formatting
 * and only changes explicit image dimensions when they exceed printable width.
 */
// Append only missing CSS properties so existing database styling is preserved.
function appendStyle(element, properties) {
	const original = element.getAttribute('style') || '';
	const additions = Object.entries(properties).filter(([property, value]) => element.style.getPropertyValue(property) !== value && !original.includes(`${property}:${value};`));
	if (additions.length) {
		const separator = original && !original.trimEnd().endsWith(';') ? ';' : '';
		element.setAttribute('style', `${original}${separator}${additions.map(([property, value]) => `${property}:${value}`).join(';')};`);
	}
}

// Scale oversized, dimensioned images to the printable page width without changing aspect ratio.
function formatImages(document, options) {
	// html-docx-js page sizes are points; HTML image dimensions are CSS pixels (0.75 pt each).
	const pageWidth = options.orientation === 'landscape' ? 792 : 612;
	// html-docx-js margins are twips, so divide by 20 to convert them to points.
	const printableWidth = pageWidth - ((options.margins?.left ?? 1134) + (options.margins?.right ?? 1134)) / 20;
	for (const image of document.querySelectorAll('img')) {
		const width = Number(image.getAttribute('width'));
		const height = Number(image.getAttribute('height'));
		if (!(width > 0 && height > 0)) continue;
		// Never enlarge images; scale only those whose CSS-pixel width exceeds the page.
		const scale = Math.min(1, printableWidth / (width * 0.75));
		if (scale === 1) continue;
		const outputWidth = Math.floor(width * scale);
		const outputHeight = Math.round(height * outputWidth / width);
		image.setAttribute('width', String(outputWidth));
		image.setAttribute('height', String(outputHeight));
		appendStyle(image, { width: `${outputWidth * 0.75}pt`, height: `${outputHeight * 0.75}pt`, 'max-width': '100%' });
	}
}

/**
 * Prepare rendered HTML for Word conversion by constraining oversized images.
 * @param {string} html Rendered document HTML.
 * @param {{orientation?: 'portrait'|'landscape', margins?: {left?: number, right?: number}}} options Word page options; margins use twips.
 * @returns {string} Serialized HTML with fitting image dimensions.
 */
module.exports = function formatDocument(html, options = {}) {
	const dom = new JSDOM(html);
	const document = dom.window.document;
	formatImages(document, options);
	const output = dom.serialize();
	dom.window.close();
	return output;
};