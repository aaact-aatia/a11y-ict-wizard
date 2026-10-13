const { JSDOM } = require('jsdom');

const primaryLanguage = (value) => String(value || '').trim().toLowerCase().split('-')[0];

const unwrap = (element) => element.replaceWith(...element.childNodes);

const PRESENTATIONAL = ['align', 'valign', 'width', 'height', 'border', 'cellspacing', 'cellpadding', 'bgcolor'];

const LIST_TYPES = { 'lower-alpha': 'a', 'lower-latin': 'a', 'upper-alpha': 'A', 'upper-latin': 'A', 'lower-roman': 'i', 'upper-roman': 'I' };

function cleanDocumentHtml(html, language) {
	const { document } = new JSDOM(html).window;
	const pageLanguage = primaryLanguage(language);
	document.documentElement.setAttribute('lang', pageLanguage);

	const title = document.title;
	document.head.replaceChildren();
	const charset = document.createElement('meta');
	charset.setAttribute('charset', 'utf-8');
	const viewport = document.createElement('meta');
	viewport.setAttribute('name', 'viewport');
	viewport.setAttribute('content', 'width=device-width, initial-scale=1');
	const titleElement = document.createElement('title');
	titleElement.textContent = title;
	document.head.append(charset, viewport, titleElement);

	for (const style of document.querySelectorAll('style')) style.remove();
	for (const wrapper of document.querySelectorAll('div.WordSection1')) unwrap(wrapper);

	for (const element of document.querySelectorAll('*')) {
		const listType = element.tagName === 'OL' && !element.hasAttribute('type') && LIST_TYPES[element.style.getPropertyValue('list-style-type').trim()];
		if (listType) element.setAttribute('type', listType);
		element.removeAttribute('style');
		element.removeAttribute('class');
		element.removeAttribute('nowrap');
		if (element.getAttribute('tabindex')?.trim() === '-1') element.removeAttribute('tabindex');
		if (element.tagName === 'IMG') continue;
		for (const name of PRESENTATIONAL) element.removeAttribute(name);
	}

	for (const span of [...document.querySelectorAll('span')].reverse()) {
		const spanLanguage = span.getAttribute('lang') ?? span.getAttribute('xml:lang');
		if (spanLanguage !== null && primaryLanguage(spanLanguage) === pageLanguage) {
			span.removeAttribute('lang');
			span.removeAttribute('xml:lang');
		}
		if (span.attributes.length === 0) unwrap(span);
	}

	for (const paragraph of document.querySelectorAll('p')) {
		const empty = !paragraph.textContent.replace(/[\s\u00a0]/gu, '') && !paragraph.id &&
			!paragraph.querySelector('img, svg, [id], [name]');
		if (empty) paragraph.remove();
	}

	for (const paragraph of document.querySelectorAll('p')) {
		const previous = paragraph.previousSibling;
		if (previous?.nodeType === 3 && previous.textContent.endsWith('\n')) continue;
		paragraph.before('\n');
	}

	return `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`;
}

module.exports = cleanDocumentHtml;
