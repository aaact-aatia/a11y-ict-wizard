const { JSDOM } = require('jsdom');

const PAGES = {
	en: {
		tocHeading: 'Found in this section',
		generated: /^Generated \d{4}-\d{2}-\d{2}$/u
	},
	fr: {
		tocHeading: 'Se trouve dans cette section',
		generated: /^Généré le \d{4}-\d{2}-\d{2}$/u
	}
};

// Lets the table and margin classes render when the file is opened in a browser.
const THEME_CSS = 'https://www.canada.ca/etc/designs/canada/wet-boew/css/theme.min.css';

const NBSP_RUN = /[ \t\r\n\u00a0]*\u00a0[ \t\r\n\u00a0]*/gu;
const BLOCK_START = 'table, thead, tbody, tr, th, td, h2, h3, h4, h5, h6, ul, ol, li, dl, dt, dd, figure, div';

const unwrap = (element) => element.replaceWith(...element.childNodes);

function trimEdges(element) {
	const first = element.firstChild;
	if (first?.nodeType === 3) first.textContent = first.textContent.replace(/^[\s\u00a0]+/u, '');
	const last = element.lastChild;
	if (last?.nodeType === 3) last.textContent = last.textContent.replace(/[\s\u00a0]+$/u, '');
}

const slug = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/gu, '');

function startsWithAnchor(element, prefix) {
	if (element?.tagName !== 'P' || !element.firstElementChild?.matches(`a[id^="${prefix}"]`)) return false;
	const before = element.firstChild;
	return before === element.firstElementChild || (before.nodeType === 3 && !before.textContent.trim());
}

function convertDefinitions(document) {
	const done = new Set();
	for (const start of [...document.querySelectorAll('p')].filter((p) => startsWithAnchor(p, 'def_'))) {
		if (done.has(start)) continue;
		const list = document.createElement('dl');
		start.before(list);
		let dd = null;
		let current = start;
		while (current) {
			const next = current.nextElementSibling;
			if (startsWithAnchor(current, 'def_')) {
				done.add(current);
				const anchor = current.firstElementChild;
				for (const strong of anchor.querySelectorAll('strong')) unwrap(strong);
				trimEdges(anchor);
				const dt = document.createElement('dt');
				dt.append(anchor);
				const colon = current.firstElementChild;
				if (colon?.tagName === 'STRONG' && /^[\s\u00a0]*:[\s\u00a0]*$/u.test(colon.textContent)) colon.remove();
				dd = document.createElement('dd');
				dd.append(...current.childNodes);
				trimEdges(dd);
				current.remove();
				list.append(dt, dd);
			} else if (current.tagName === 'P' && dd) {
				dd.append(current);
			} else if ((current.tagName === 'UL' || current.tagName === 'OL') && dd) {
				dd.append(current);
			} else {
				break;
			}
			current = next;
		}
	}
}

function convertAbbreviations(document) {
	const heading = [...document.querySelectorAll('h3')].find((h) => /Abbreviations|Abréviations/iu.test(h.textContent));
	if (!heading) return;
	const rows = [];
	for (let current = heading.nextElementSibling; current && !/^H[1-6]$/u.test(current.tagName); current = current.nextElementSibling) {
		rows.push(current);
	}
	let list = null;
	for (const row of rows) {
		const first = row.firstChild;
		const intro = /:\s*$/u.test(row.textContent.trim());
		const match = row.tagName === 'P' && first?.nodeType === 3 &&
			(/^([^\s\u00a0]+)[ \t\r\n\u00a0]*\u00a0[ \t\r\n\u00a0]*/u.exec(first.textContent) ||
				(!intro && /^([^\s\u00a0]+)[ \t\r\n]+(?=\S)/u.exec(first.textContent)));
		if (!match) { list = null; continue; }
		if (!list) { list = document.createElement('dl'); row.before(list); }
		first.textContent = first.textContent.slice(match[0].length);
		const dt = document.createElement('dt');
		dt.textContent = match[1];
		const dd = document.createElement('dd');
		dd.append(...row.childNodes);
		trimEdges(dd);
		list.append(dt, dd);
		row.remove();
	}
}

function convertReferences(document) {
	for (const start of [...document.querySelectorAll('p')].filter((p) => startsWithAnchor(p, 'ref_'))) {
		if (!start.isConnected) continue;
		const list = document.createElement('ul');
		list.className = 'list-unstyled';
		start.before(list);
		for (let current = start; startsWithAnchor(current, 'ref_');) {
			const next = current.nextElementSibling;
			const anchor = current.firstElementChild;
			const strong = document.createElement('strong');
			strong.append(...anchor.childNodes);
			anchor.append(strong);
			const li = document.createElement('li');
			li.append(...current.childNodes);
			trimEdges(li);
			list.append(li);
			current.remove();
			current = next;
		}
	}
}

const indentClass = (count) => (count >= 7 ? 'mrgn-lft-xl' : count >= 4 ? 'mrgn-lft-lg' : count >= 2 ? 'mrgn-lft-md' : 'mrgn-lft-sm');

// Leading runs of non-breaking spaces were used as indents; WET margin classes replace them.
function convertIndents(document) {
	for (const block of document.querySelectorAll('p, li, td, th, dd')) {
		const first = block.firstChild;
		const match = first?.nodeType === 3 && /^[ \t\r\n\u00a0]*/u.exec(first.textContent)[0];
		const count = match ? (match.match(/\u00a0/gu) || []).length : 0;
		if (count < 2 || !first.textContent.slice(match.length).trim()) continue;
		first.textContent = first.textContent.slice(match.length);
		block.classList.add(indentClass(count));
	}
}

const isNote = (element) => element?.tagName === 'P' && /^NOTE\b/iu.test(element.textContent.trim());

// A list whose only children are other lists (invalid markup used to indent) becomes those lists with a margin class.
function flattenIndentLists(document) {
	const isList = (node) => node.nodeType === 1 && /^(OL|UL)$/u.test(node.tagName);
	for (const wrapper of [...document.querySelectorAll('ol, ul')]) {
		const nodes = [...wrapper.childNodes].filter((node) => node.nodeType !== 3 || node.textContent.trim());
		if (!nodes.length || !nodes.every(isList)) continue;
		for (const list of nodes) {
			list.classList.add('mrgn-lft-lg', ...wrapper.classList);
			for (const name of wrapper.getAttributeNames()) {
				if (name !== 'class' && !list.hasAttribute(name)) list.setAttribute(name, wrapper.getAttribute(name));
			}
		}
		wrapper.replaceWith(...nodes);
	}
}

function removeBreaksAfterCommas(document) {
	for (const br of document.querySelectorAll('br')) {
		const before = br.previousSibling;
		if (before?.nodeType !== 3 || !/,[\s\u00a0]*$/u.test(before.textContent)) continue;
		before.textContent = before.textContent.trimEnd();
		const after = br.nextSibling;
		if (after?.nodeType === 3) after.textContent = after.textContent.replace(/^[\s\u00a0]+/u, '');
		br.replaceWith(' ');
	}
}

function wrapNotes(document) {
	for (const first of [...document.querySelectorAll('p')]) {
		if (!isNote(first) || isNote(first.previousElementSibling)) continue;
		const run = [first];
		while (isNote(run.at(-1).nextElementSibling)) run.push(run.at(-1).nextElementSibling);
		const wrapper = document.createElement('div');
		wrapper.className = 'mrgn-lft-md mrgn-rght-md mrgn-tp-sm mrgn-bttm-sm';
		first.before(wrapper);
		wrapper.append(...run);
	}
}

function collapseNonBreakingSpaces(document) {
	const walker = document.createTreeWalker(document.body, 4);
	const nodes = [];
	while (walker.nextNode()) nodes.push(walker.currentNode);
	for (const node of nodes) {
		const text = node.textContent;
		if (!text.includes('\u00a0')) continue;
		node.textContent = node.parentElement.closest('h1, h2, h3, h4, h5, h6')
			? text.replace(/[\s\u00a0]+/gu, ' ')
			: text.replace(NBSP_RUN, (run) => (run === '\u00a0' ? run : ' '));
	}
}

function normalizeTableHeaders(document) {
	for (const table of document.querySelectorAll('table')) {
		let headers = [...table.children].filter((child) => child.tagName === 'THEAD');
		if (headers.length > 1) {
			for (const header of headers.slice(1)) {
				while (header.firstChild) headers[0].append(header.firstChild);
				header.remove();
			}
			headers = [headers[0]];
		}

		let header = headers[0];
		if (!header?.querySelector('tr')) {
			const firstRow = table.querySelector(':scope > tbody > tr, :scope > tr');
			if (!firstRow) continue;
			header ??= document.createElement('thead');
			firstRow.closest('tbody')
				? table.insertBefore(header, firstRow.closest('tbody'))
				: table.insertBefore(header, firstRow);
			header.append(firstRow);
		}

		for (const cell of header.querySelectorAll('td')) {
			const th = document.createElement('th');
			for (const attribute of [...cell.attributes]) th.setAttribute(attribute.name, attribute.value);
			while (cell.firstChild) th.append(cell.firstChild);
			cell.replaceWith(th);
		}
		for (const th of header.querySelectorAll('th')) {
			if (!th.hasAttribute('scope')) th.setAttribute('scope', 'col');
		}
	}
}

// The clause list is a one-column table; its cell contents become regular page content with a heading per clause.
function flattenClauseTable(document) {
	const table = [...document.querySelectorAll('a[id]')].find((a) => /^clause_\d+$/u.test(a.id))?.closest('table');
	if (!table || [...table.rows].some((row) => row.cells.length !== 1)) return;
	const fragment = document.createDocumentFragment();
	for (const row of table.querySelectorAll('tbody tr')) {
		const cell = row.cells[0];
		const titleParagraph = cell.firstElementChild;
		const anchor = titleParagraph?.matches('p') && titleParagraph.querySelector(':scope > strong > a[id^="clause_"]');
		if (anchor && titleParagraph.textContent.trim() === anchor.textContent.trim()) {
			// Clause 5 sits under the h2 for Part B, so each extra level of nesting goes one heading down.
			const heading = document.createElement(`h${Math.min(6, 2 + anchor.id.split('_').length - 1)}`);
			heading.id = anchor.id;
			heading.append(...anchor.childNodes);
			titleParagraph.replaceWith(heading);
		}
		fragment.append(...cell.childNodes);
	}
	table.replaceWith(fragment);
}

function moveDestinationIds(document) {
	for (const anchor of document.querySelectorAll('a[id]:not([href])')) {
		if (!/^(clause_|def_|ref_|table_|figure_)/u.test(anchor.id)) continue;
		const parent = anchor.closest('p, dt, li, h2, h3, h4, h5, h6, caption, figcaption');
		if (!parent || (parent.id && parent.id !== anchor.id)) continue;
		parent.id = anchor.id;
		unwrap(anchor);
	}
}

function buildContents(document, heading) {
	const items = [...document.querySelectorAll('[id^="clause_"]')]
		.filter((a) => /^clause_\d+$/u.test(a.id))
		.map((a) => [a.id, a.textContent.replace(/\s+/gu, ' ').trim()]);
	const anchor = items.length ? document.getElementById(items[0][0]) : null;
	const target = anchor?.closest('table') ?? anchor?.closest('h2, h3, h4, h5, h6, p');
	if (!target) return;
	for (const h2 of document.querySelectorAll('h2')) {
		const text = h2.textContent.replace(/\s+/gu, ' ').trim();
		if (!/^Annexe?\b/iu.test(text)) continue;
		h2.id ||= slug(text);
		items.push([h2.id, text]);
	}
	const title = document.createElement('h2');
	title.id = slug(heading);
	title.textContent = heading;
	const list = document.createElement('ul');
	for (const [id, text] of items) {
		const li = document.createElement('li');
		const link = document.createElement('a');
		link.href = `#${id}`;
		link.textContent = text;
		li.append(link);
		list.append(li);
	}
	target.before(title, list);
}

function formatDatPage(html, language) {
	const page = PAGES[language === 'fr' ? 'fr' : 'en'];
	const { document } = new JSDOM(html).window;
	const title = document.title;

	document.querySelector('h1')?.remove();
	[...document.querySelectorAll('p')].find((p) => page.generated.test(p.textContent.trim()))?.remove();
	for (const div of [...document.querySelectorAll('div')].reverse()) {
		if (!div.id && !div.getAttribute('name')) unwrap(div);
	}

	flattenClauseTable(document);
	flattenIndentLists(document);
	removeBreaksAfterCommas(document);

	for (const table of document.querySelectorAll('table')) {
		for (const name of table.getAttributeNames()) table.removeAttribute(name);
		table.className = 'table table-striped table-hover';
	}

	convertDefinitions(document);
	convertAbbreviations(document);
	convertReferences(document);
	convertIndents(document);
	collapseNonBreakingSpaces(document);
	wrapNotes(document);
	moveDestinationIds(document);
	buildContents(document, page.tocHeading);
	normalizeTableHeaders(document);

	for (const element of document.querySelectorAll(BLOCK_START)) {
		const previous = element.previousSibling;
		if (!(previous?.nodeType === 3 && /\n[ \t]*$/u.test(previous.textContent))) element.before('\n');
	}

	// No blank lines or indentation, so the body can be pasted into a Markdown page without breaking its HTML blocks.
	const body = document.body.innerHTML
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join('\n');
	const lang = language === 'fr' ? 'fr' : 'en';
	const titleElement = document.createElement('title');
	titleElement.textContent = title;
	return `<!DOCTYPE html>\n<html lang="${lang}">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${titleElement.outerHTML}\n<link rel="stylesheet" href="${THEME_CSS}">\n</head>\n<body class="container">\n${body}\n</body>\n</html>\n`;
}

module.exports = formatDatPage;
