const { JSDOM } = require('jsdom');

const normalize = (text) => text.normalize('NFC').replace(/\s+/gu, ' ').trim().toLowerCase();
const copy = (record) => typeof record.toObject === 'function' ? record.toObject() : { ...record };
const blockSelector = 'p, li, caption, figcaption, td, th';
const captionPattern = /^(figure|table|tableau)\s+(\d+(?:\.\d+)+(?:[a-z])?)\s*:/iu;
const referencePattern = /\b(figures?|tables?|tableaux?)\s+(\d+(?:\.\d+)+(?:[a-z])?)/giu;

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

function blocks(fragment) {
	return [...fragment.querySelectorAll(blockSelector)].filter((element) => !element.querySelector(blockSelector));
}

function typeFor(label) {
	return /^figures?$/iu.test(label) ? 'figure' : 'table';
}

function idFor(type, number, reserved) {
	const suffix = normalize(number).replace(/[^a-z0-9]+/gu, '_').replace(/^_|_$/gu, '');
	const base = `${type}_${suffix}`;
	let id = base;
	let duplicate = 2;
	while (reserved.has(id)) id = `${base}_${duplicate++}`;
	reserved.add(id);
	return id;
}

function collectDocuments(clauses, annex, intro, language) {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const complianceField = language === 'fr' ? 'frCompliance' : 'compliance';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	return [
		...clauses.flatMap((item) => [descriptionField, complianceField].map((field) => ({ item, field, location: item.number }))),
		...annex.flatMap((item) => [{ item, field: bodyField, location: item.name }]),
		...intro.flatMap((item) => [{ item, field: bodyField, location: item.name }])
	].filter(({ item, field }) => item[field]).map((document) => ({
		...document,
		fragment: JSDOM.fragment(document.item[document.field])
	}));
}

function captionKey(label, number) {
	return `${typeFor(label)}:${normalize(number)}`;
}

function buildIndex(documents, reserved) {
	const index = new Map();
	for (const document of documents) {
		for (const block of blocks(document.fragment)) {
			const match = block.textContent.trim().match(captionPattern);
			if (!match) continue;
			const key = captionKey(match[1], match[2]);
			if (index.has(key)) {
				index.set(key, null);
				continue;
			}
			const id = idFor(typeFor(match[1]), match[2], reserved);
			block.id = id;
			block.setAttribute('tabindex', '-1');
			index.set(key, { id, block });
		}
	}
	return index;
}

function linkBlock(block, index) {
	const text = block.textContent;
	const caption = text.trim().match(captionPattern);
	const matches = [...text.matchAll(referencePattern)];
	for (const match of matches.reverse()) {
		if (caption && match.index === 0 && captionKey(match[1], match[2]) === captionKey(caption[1], caption[2])) continue;
		const target = index.get(captionKey(match[1], match[2]));
		if (!target || target.block === block) continue;
		const start = match.index;
		const end = start + match[0].length;
		const marker = text.slice(end).match(/^(\s*)\*/u);
		if (marker) rangeFor(block, end + marker[1].length, end + marker[1].length + 1).deleteContents();
		const range = rangeFor(block, start, end);
		if (range.cloneContents().querySelector('a') || range.startContainer.parentElement?.closest('a')) continue;
		const link = block.ownerDocument.createElement('a');
		link.setAttribute('href', `#${target.id}`);
		link.append(range.extractContents());
		range.insertNode(link);
	}
}

/**
 * Link table and figure references to matching captions included in generated content.
 * Missing and ambiguous targets are left untouched. Records are copied before mutation.
 * @param {{clauses: object[], annex: object[], intro?: object[], language?: 'en'|'fr'}} input
 * @returns {{clauses: object[], annex: object[], intro: object[]}}
 */
module.exports = function linkTableFigures({ clauses, annex, intro = [], language = 'en' }) {
	const clauseCopies = clauses.map(copy);
	const annexCopies = annex.map(copy);
	const introCopies = intro.map(copy);
	const documents = collectDocuments(clauseCopies, annexCopies, introCopies, language);
	const reserved = new Set();
	for (const { fragment } of documents) {
		for (const element of fragment.querySelectorAll('[id], a[name]')) {
			if (element.id) reserved.add(element.id);
			if (element.getAttribute('name')) reserved.add(element.getAttribute('name'));
		}
	}
	const index = buildIndex(documents, reserved);
	for (const document of documents) {
		for (const block of blocks(document.fragment)) linkBlock(block, index);
		document.item[document.field] = serialize(document.fragment);
	}
	return { clauses: clauseCopies, annex: annexCopies, intro: introCopies };
};