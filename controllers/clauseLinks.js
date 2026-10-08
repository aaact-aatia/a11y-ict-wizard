const { JSDOM } = require('jsdom');

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

function clauseId(number, reserved) {
	const suffix = normalize(number).replace(/[^a-z0-9]+/gu, '_').replace(/^_|_$/gu, '');
	const base = `clause_${suffix}`;
	let id = base;
	let duplicate = 2;
	while (reserved.has(id)) id = `${base}_${duplicate++}`;
	reserved.add(id);
	return id;
}

function addPerformanceCriterionTargets(intro, bodyField, reserved, index) {
	for (const item of intro) {
		if (!/^(?:Part A|Partie A)\b.*4\.2\b/iu.test(item.name || item.frName || '')) continue;
		const fragment = JSDOM.fragment(item[bodyField] || '');
		let changed = false;
		for (const paragraph of fragment.querySelectorAll('p')) {
			const heading = paragraph.querySelector('strong, b');
			const match = heading?.textContent.trim().match(/^((?:[a-z]\.)?\d+(?:\.\d+)+)\s+/iu);
			if (!match) continue;
			const key = normalize(match[1]);
			if (index.has(key)) continue;
			const id = heading.id || clauseId(match[1], reserved);
			heading.id = id;
			index.set(key, { id });
			changed = true;
		}
		if (changed) item[bodyField] = serialize(fragment);
	}
}

function referenceFrom(text) {
	const match = text.trim().match(/^(?:clauses?\s+)?((?:[a-z]\.)?\d+(?:\.\d+)*)(?:\s+\([^()]*\))?$/iu);
	return match ? normalize(match[1]) : null;
}

function markedReference(element, root) {
	const before = element.ownerDocument.createRange();
	before.selectNodeContents(root);
	before.setEndBefore(element);
	const start = before.toString().length;
	const through = element.ownerDocument.createRange();
	through.selectNodeContents(root);
	through.setEndAfter(element);
	const end = through.toString().length;
	const text = root.textContent.slice(start, end);
	const inside = text.match(/^(.*?)(\s*)\*$/u);
	if (inside) return { start, end, text: inside[1], marker: end - 1 };
	const after = root.textContent.slice(end).match(/^(\s*)\*/u);
	return { start, end, text, marker: after ? end + after[1].length : null };
}

function transform(fragment, index, location, unresolved, currentClause) {
	const marked = [...fragment.querySelectorAll('u, span[style]')].filter(isUnderlined);
	const outerMarked = marked.filter((element) => !marked.some((other) => other !== element && other.contains(element)));
	for (const element of outerMarked) {
		if (element.closest('a') || element.querySelector('a')) continue;
		const root = element.closest('p, li, td, th, div') || fragment;
		const reference = markedReference(element, root);
		const key = referenceFrom(reference.text);
		if (!key) continue;
		if (key === currentClause) continue;
		const target = index.get(key);
		if (!target) {
			if (reference.marker !== null) {
				unresolved.push({ clause: reference.text.trim(), location, reason: index.has(key) ? 'ambiguous' : 'missing' });
			}
			continue;
		}
		let linkEnd = reference.end;
		if (reference.marker !== null) {
			rangeFor(root, reference.marker, reference.marker + 1).deleteContents();
			if (reference.marker < linkEnd) linkEnd -= 1;
		}
		const range = rangeFor(root, reference.start, linkEnd);
		const link = element.ownerDocument.createElement('a');
		link.setAttribute('href', `#${target.id}`);
		link.append(range.extractContents());
		range.insertNode(link);
	}
}

/**
 * Link underlined clause-number references to matching clauses included in the document.
 * Unresolved references are left unchanged, and records are copied before modification.
 * @param {{clauses: object[], annex: object[], intro?: object[], language?: 'en'|'fr'}} input
 * @returns {{clauses: object[], annex: object[], intro: object[], unresolved: object[]}}
 */
module.exports = function linkClauses({ clauses, annex, intro = [], language = 'en' }) {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const complianceField = language === 'fr' ? 'frCompliance' : 'compliance';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	const clauseCopies = clauses.map(copy);
	const annexCopies = annex.map(copy);
	const introCopies = intro.map(copy);
	const fragments = [...clauseCopies, ...annexCopies, ...introCopies].flatMap((item) =>
		[descriptionField, complianceField, bodyField]
			.filter((field) => item[field])
			.map((field) => JSDOM.fragment(item[field])));
	const reserved = new Set();
	for (const fragment of fragments) {
		for (const element of fragment.querySelectorAll('[id], a[name]')) {
			if (element.id) reserved.add(element.id);
			if (element.getAttribute('name')) reserved.add(element.getAttribute('name'));
		}
	}
	const index = new Map();
	for (const clause of clauseCopies) {
		const key = normalize(clause.number || '');
		if (!key) continue;
		clause.clauseLinkId = clauseId(clause.number, reserved);
		if (index.has(key)) index.set(key, null);
		else index.set(key, { id: clause.clauseLinkId });
	}
	addPerformanceCriterionTargets(introCopies, bodyField, reserved, index);
	const unresolved = [];
	for (const clause of clauseCopies) {
		const currentClause = normalize(clause.number || '');
		for (const field of [descriptionField, complianceField]) {
			if (!clause[field]) continue;
			const fragment = JSDOM.fragment(clause[field]);
			transform(fragment, index, clause.number, unresolved, currentClause);
			clause[field] = serialize(fragment);
		}
	}
	for (const item of [...annexCopies, ...introCopies]) {
		if (!item[bodyField]) continue;
		const fragment = JSDOM.fragment(item[bodyField]);
		transform(fragment, index, item.name, unresolved, null);
		item[bodyField] = serialize(fragment);
	}
	return { clauses: clauseCopies, annex: annexCopies, intro: introCopies, unresolved };
};