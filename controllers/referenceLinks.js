const { JSDOM } = require('jsdom');

/*
 * Adds document-local links between underlined bracketed citations and entries in
 * the included References annex. It supports both numeric [number] and [i.number]
 * labels. Input records are copied before their HTML is transformed.
 */
const normalize = (text) => text.normalize('NFC').replace(/\s+/gu, ' ').trim().toLowerCase();
const isUnderlined = (element) => element.tagName === 'U' ||
	(element.tagName === 'SPAN' && /underline/u.test(element.style.textDecoration + element.style.textDecorationLine));
const copy = (record) => typeof record.toObject === 'function' ? record.toObject() : { ...record };

function serialize(fragment) {
	const container = fragment.ownerDocument.createElement('div');
	container.append(fragment.cloneNode(true));
	return container.innerHTML;
}

function textNodes(root) {
	const walker = root.ownerDocument.createTreeWalker(root, 4);
	const nodes = [];
	let node;
	let offset = 0;
	while ((node = walker.nextNode())) {
		nodes.push({ node, start: offset, end: offset + node.textContent.length });
		offset += node.textContent.length;
	}
	return nodes;
}

function rangeFor(root, start, end) {
	const nodes = textNodes(root);
	const first = nodes.find((entry) => entry.end > start);
	const last = nodes.find((entry) => entry.end >= end && entry.end > entry.start);
	const range = root.ownerDocument.createRange();
	range.setStart(first.node, start - first.start);
	range.setEnd(last.node, end - last.start);
	return range;
}

// Reference entries identify themselves with a bracketed citation at paragraph start.
function citationAtStart(paragraph) {
	const match = paragraph.textContent.match(/^(\s*)(\[(?:i\.)?\d+\])/iu);
	if (!match) return null;
	const start = match[1].length;
	return { label: match[2], start, end: start + match[2].length };
}

function createDestination(paragraph, label, reserved) {
	const key = normalize(label);
	const existing = [...paragraph.querySelectorAll('a[id][name]')].find((anchor) => normalize(anchor.textContent) === key);
	if (existing) return { id: existing.id, paragraph };

	const suffix = key.slice(1, -1).replace(/[^a-z0-9]+/gu, '_');
	const base = `ref_${suffix}`;
	let id = base;
	let duplicate = 2;
	while (reserved.has(id)) id = `${base}_${duplicate++}`;
	reserved.add(id);

	const citation = citationAtStart(paragraph);
	const range = rangeFor(paragraph, citation.start, citation.end);
	const anchor = paragraph.ownerDocument.createElement('a');
	anchor.id = id;
	anchor.setAttribute('name', id);
	anchor.setAttribute('tabindex', '-1');
	anchor.setAttribute('style', 'color: inherit; text-decoration: none;');
	anchor.append(range.extractContents());
	range.insertNode(anchor);
	return { id, paragraph };
}

function buildReferenceIndex(referenceDocuments, reserved) {
	const index = new Map();
	for (const { fragment } of referenceDocuments) {
		for (const paragraph of fragment.querySelectorAll('p, li')) {
			const citation = citationAtStart(paragraph);
			if (!citation) continue;
			const key = normalize(citation.label);
			const target = createDestination(paragraph, citation.label, reserved);
			if (index.has(key)) index.set(key, null);
			else index.set(key, target);
		}
	}
	return index;
}

// Accept brackets inside the underline or surrounding an underlined i.number label.
function underlinedCitation(marked, root) {
	const before = marked.ownerDocument.createRange();
	before.selectNodeContents(root);
	before.setEndBefore(marked);
	const start = before.toString().length;
	const through = marked.ownerDocument.createRange();
	through.selectNodeContents(root);
	through.setEndAfter(marked);
	const end = through.toString().length;
	const text = root.textContent.slice(start, end);
	const splitBracket = text.match(/^(\s*)(\[(?:i\.)?\d+)(\s*\*)?$/iu);
	if (splitBracket) {
		const following = root.textContent.slice(end);
		const closing = following.match(/^(\s*)(\*)?\]/u);
		if (closing) {
			const linkStart = start + splitBracket[1].length;
			const linkEnd = end + closing[0].length;
			const markerOffset = splitBracket[3]
				? start + splitBracket[1].length + splitBracket[2].length + splitBracket[3].length - 1
				: closing[2] ? end + closing[1].length : null;
			const afterCitation = root.textContent.slice(linkEnd).match(/^(\s*)\*/u);
			return {
				label: `${splitBracket[2]}]`,
				linkStart,
				linkEnd,
				markerOffset: markerOffset ?? (afterCitation ? linkEnd + afterCitation[1].length : null)
			};
		}
	}
	const match = text.match(/^(\s*)(\[(?:i\.)?\d+\]|(?:i\.)?\d+)(\s*\*)?$/iu);
	if (!match) return null;

	let linkStart = start + match[1].length;
	let linkEnd = linkStart + match[2].length;
	if (!match[2].startsWith('[') && root.textContent[linkStart - 1] === '[' && root.textContent[linkEnd] === ']') {
		linkStart -= 1;
		linkEnd += 1;
	}
	const label = match[2].startsWith('[') ? match[2] : `[${match[2]}]`;
	const internalMarkerOffset = match[3] ? start + match[1].length + match[2].length + match[3].length - 1 : null;
	const followingMarker = root.textContent.slice(linkEnd).match(/^(\s*)\*/u);
	const markerOffset = internalMarkerOffset ?? (followingMarker ? linkEnd + followingMarker[1].length : null);
	return { label, linkStart, linkEnd, markerOffset };
}

function transformReferences(fragment, index, location, unresolved) {
	const marked = [...fragment.querySelectorAll('u, span[style]')].filter(isUnderlined);
	const outerMarked = marked.filter((element) => !marked.some((other) => other !== element && other.contains(element)));
	for (const element of outerMarked) {
		if (element.closest('a') || element.querySelector('a')) continue;
		const root = element.closest('p, li, td, th, div') || fragment;
		const citation = underlinedCitation(element, root);
		if (!citation) continue;
		const key = normalize(citation.label);
		const target = index.get(key);
		if (!target || target.paragraph === root) {
			if (citation.markerOffset !== null) unresolved.push({ reference: citation.label, location, reason: index.has(key) ? 'ambiguous' : 'missing' });
			continue;
		}
		let linkEnd = citation.linkEnd;
		if (citation.markerOffset !== null) {
			rangeFor(root, citation.markerOffset, citation.markerOffset + 1).deleteContents();
			if (citation.markerOffset < linkEnd) linkEnd -= 1;
		}
		const range = rangeFor(root, citation.linkStart, linkEnd);
		const link = element.ownerDocument.createElement('a');
		link.setAttribute('href', `#${target.id}`);
		link.append(range.extractContents());
		range.insertNode(link);
	}
}

/**
 * Link underlined [number] and [i.number] citations to the included References annex.
 * Recognized markers are removed only after a destination is found; other bracketed
 * references and unknown citations are left unchanged. Destinations are attached to
 * the citation label at the start of each reference paragraph, and duplicate labels
 * are treated as ambiguous rather than linked to an arbitrary entry.
 * @param {{clauses: object[], annex: object[], intro?: object[], language?: 'en'|'fr'}} input
 * @returns {{clauses: object[], annex: object[], intro: object[], unresolved: object[]}}
 */
module.exports = function linkReferences({ clauses, annex, intro = [], language = 'en' }) {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	const clauseCopies = clauses.map(copy);
	const annexCopies = annex.map(copy);
	const introCopies = intro.map(copy);
	const documents = [...annexCopies, ...introCopies].map((item) => ({ item, fragment: JSDOM.fragment(item[bodyField] || '') }));
	const references = documents.filter(({ item }) => /^Annex.*References/iu.test(item.name));
	if (!references.length) return { clauses: clauseCopies, annex: annexCopies, intro: introCopies, unresolved: [] };

	const reserved = new Set();
	for (const item of [...clauseCopies, ...annexCopies, ...introCopies]) {
		const fragment = JSDOM.fragment(item[descriptionField] || item[bodyField] || '');
		for (const element of fragment.querySelectorAll('[id], a[name]')) {
			if (element.id) reserved.add(element.id);
			if (element.getAttribute('name')) reserved.add(element.getAttribute('name'));
		}
	}
	const index = buildReferenceIndex(references, reserved);
	const unresolved = [];
	for (const { item, fragment } of documents) {
		transformReferences(fragment, index, item.name, unresolved);
		item[bodyField] = serialize(fragment);
	}
	for (const clause of clauseCopies) {
		const fragment = JSDOM.fragment(clause[descriptionField] || '');
		transformReferences(fragment, index, clause.number, unresolved);
		clause[descriptionField] = serialize(fragment);
	}
	return { clauses: clauseCopies, annex: annexCopies, intro: introCopies, unresolved };
};