const { createHash } = require('node:crypto');
const { JSDOM } = require('jsdom');
const definitionMappings = require('../JSON/underlined-reference-drafts/definitions.json');

/*
 * Builds document-local links to terms in the Annex 3.1 definitions section.
 * The input records are copied before HTML is transformed, so callers retain
 * their original Mongoose records. The returned records contain serialized
 * HTML, and unresolved starred references are reported with their source.
 */
const normalize = (text) => text.normalize('NFC').replace(/[\u2018\u2019]/gu, "'").replace(/\s+/gu, ' ').trim().toLowerCase();
const isUnderlined = (element) => element.tagName === 'U' ||
	(element.tagName === 'SPAN' && /underline/u.test(element.style.textDecoration + element.style.textDecorationLine));
const copy = (record) => typeof record.toObject === 'function' ? record.toObject() : { ...record };

// Serialize a cloned fragment so its original owner document is not replaced.
function serialize(fragment) {
	const container = fragment.ownerDocument.createElement('div');
	container.append(fragment.cloneNode(true));
	return container.innerHTML;
}

// Record text-node offsets so a visible phrase can be wrapped across inline tags.
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

// Convert offsets in concatenated text back into a DOM Range spanning text nodes.
function rangeFor(nodes, start, end) {
	const first = nodes.find((entry) => entry.end > start);
	const last = nodes.find((entry) => entry.end >= end && entry.end > entry.start);
	const range = first.node.ownerDocument.createRange();
	range.setStart(first.node, start - first.start);
	range.setEnd(last.node, end - last.start);
	return range;
}

// Definition labels with parenthetical qualifiers can also be referenced by either part.
function aliases(label) {
	const values = [normalize(label)];
	const parenthetical = label.match(/^(.+?)\s+\(([^()]+)\)$/u);
	if (parenthetical) {
		values.push(normalize(parenthetical[1]));
		if (!/\s/u.test(parenthetical[2])) values.push(normalize(parenthetical[2]));
	}
	return [...new Set(values)];
}

// Keep one unambiguous destination per normalized term; null represents a collision.
function addCatalogTerm(catalog, term, target, canonicalKeys) {
	const key = normalize(term).replace(/\s*\*$/u, '').trim();
	if (!key || canonicalKeys.has(key)) return;
	if (catalog.has(key)) {
		const existing = catalog.get(key);
		if (existing && (existing.id !== target.id || existing.paragraph !== target.paragraph)) catalog.set(key, null);
		return;
	}
	catalog.set(key, target);
}

// A definition marker may be inside the underline or in adjacent following text.
// A null offset means the mapped underlined term has no marker to remove.
function splitDefinitionMarker(text, followingText) {
	const inside = text.match(/^(.*?)(\s*)\*$/u);
	if (inside) return { term: inside[1], offset: text.length - 1 };
	const outside = followingText.match(/^(\s*)\*/u);
	if (outside) return { term: text, offset: text.length + outside[1].length };
	return { term: text, offset: null };
}

/** Collect definition labels from the Annex 3.1 terms section. */
function definitionParagraphs(fragment) {
	const paragraphs = [];
	let inTerms = false;
	for (const element of fragment.querySelectorAll('h2, h3, h4, p')) {
		if (/^H[234]$/u.test(element.tagName)) {
			inTerms = /^3\.1(?:\s|$)/u.test(element.textContent.trim());
			continue;
		}
		if (!inTerms) continue;
		const colon = element.textContent.indexOf(':');
		if (colon < 1 || colon > 150) continue;
		const label = element.textContent.slice(0, colon).trim().replace(/\*$/u, '').trim();
		if (/^(NOTE|REMARQUE|EXAMPLE|EXEMPLE)(?:\s|$)/iu.test(label)) continue;
		// Database formatting may nest the emphasized label in bookmark and language spans.
		const walker = element.ownerDocument.createTreeWalker(element, 4);
		let first;
		while ((first = walker.nextNode())) if (first.textContent.trim()) break;
		let emphasized = false;
		for (let ancestor = first?.parentElement; ancestor && ancestor !== element; ancestor = ancestor.parentElement) {
			if (ancestor.matches('strong, b, a[id][name], span[id]') || isUnderlined(ancestor)) {
				emphasized = true;
				break;
			}
		}
		const plainMarked = /^[\p{L}\p{N}][\p{L}\p{N}\s'\u2019()/,-]*\*\s*$/u.test(element.textContent.slice(0, colon));
		if (emphasized || plainMarked) paragraphs.push({ paragraph: element, label, colon });
	}
	return paragraphs;
}

// Keep plain-text linking within blocks and stop at existing links or underlining.
function plainRuns(fragment) {
	const runs = [];
	let current = [];
	let offset = 0;
	const flush = () => {
		if (current.length) runs.push(current);
		current = [];
		offset = 0;
	};
	const visit = (node) => {
		if (node.nodeType === 3) {
			current.push({ node, start: offset, end: offset + node.textContent.length });
			offset += node.textContent.length;
			return;
		}
		if (node.nodeType === 1 && (node.matches('a, script, style') || isUnderlined(node))) {
			flush();
			return;
		}
		const block = node.nodeType === 1 && node.matches('p, li, div, td, th, h1, h2, h3, h4, br');
		if (block) flush();
		for (const child of node.childNodes) visit(child);
		if (block) flush();
	};
	visit(fragment);
	flush();
	return runs;
}

function termPattern(term) {
	return term.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&').replace(/'/gu, "['\u2018\u2019]").replace(/ /gu, '\\s+');
}

/** Link recognized definition terms while preserving unknown underlined text. */
function transform(fragment, catalog, location, unresolved, matcher) {
	const resolve = (term) => {
		const key = normalize(term);
		if (/^\[[^\]]+\]$/u.test(key)) return undefined;
		const target = catalog.get(key);
		if (!target) unresolved.push({ term: term.trim(), location, reason: catalog.has(key) ? 'ambiguous' : 'missing' });
		return target;
	};
	// First handle underlined phrases, joining adjacent underline fragments when needed.
	const markedElements = Array.from(fragment.querySelectorAll('u, span[style]')).filter(isUnderlined);
	const outerMarkedElements = markedElements.filter((marked) =>
		!markedElements.some((other) => other !== marked && other.contains(marked)));
	const handled = new Set();
	for (let index = 0; index < outerMarkedElements.length; index += 1) {
		const marked = outerMarkedElements[index];
		if (handled.has(marked) || marked.closest('a') || marked.querySelector('a')) continue;
		const root = marked.closest('p, li, td, th, div') || fragment;
		const group = [marked];
		const targetForGroup = () => {
			const before = marked.ownerDocument.createRange();
			before.selectNodeContents(root);
			before.setEndBefore(group[0]);
			const start = before.toString().length;
			const through = marked.ownerDocument.createRange();
			through.selectNodeContents(root);
			through.setEndAfter(group[group.length - 1]);
			const end = through.toString().length;
			const text = root.textContent.slice(start, end);
			const marker = splitDefinitionMarker(text, root.textContent.slice(end));
			const target = catalog.get(normalize(marker.term));
			if (!target || target.paragraph === root) return null;
			return {
				target,
				markerOffset: marker.offset === null ? null : start + marker.offset
			};
		};
		let match = targetForGroup();
		while (!match && index + group.length < outerMarkedElements.length) {
			const next = outerMarkedElements[index + group.length];
			if (next.closest('a') || next.querySelector('a') || (next.closest('p, li, td, th, div') || fragment) !== root) break;
			const gap = marked.ownerDocument.createRange();
			gap.setStartAfter(group[group.length - 1]);
			gap.setEndBefore(next);
			if (!/^\s*$/u.test(gap.toString()) || gap.cloneContents().querySelector('br, p, li, td, th, div, h1, h2, h3, h4')) break;
			group.push(next);
			match = targetForGroup();
		}
		if (!match) {
			const before = marked.ownerDocument.createRange();
			before.selectNodeContents(root);
			before.setEndBefore(marked);
			const end = before.toString().length + marked.textContent.length;
			const marker = splitDefinitionMarker(marked.textContent, root.textContent.slice(end));
			const target = marker.offset === null ? catalog.get(normalize(marker.term)) : resolve(marker.term);
			if (!target || target.paragraph === root) continue;
			match = { target, markerOffset: marker.offset === null ? null : end + marker.offset };
			group.splice(1);
		}
		if (match.markerOffset !== null) {
			rangeFor(textNodes(root), match.markerOffset, match.markerOffset + 1).deleteContents();
		}
		const range = marked.ownerDocument.createRange();
		range.setStartBefore(group[0]);
		range.setEndAfter(group[group.length - 1]);
		const link = marked.ownerDocument.createElement('a');
		link.setAttribute('href', `#${match.target.id}`);
		link.append(range.extractContents());
		range.insertNode(link);
		for (const element of group) handled.add(element);
	}
	// Also link starred terms in ordinary text, excluding underlined runs and existing anchors.
	if (!matcher) return;
	for (const nodes of plainRuns(fragment)) {
		const text = nodes.map((entry) => entry.node.textContent).join('');
		const matches = Array.from(text.matchAll(matcher));
		for (const match of matches.reverse()) {
			const target = resolve(match[1]);
			const root = rangeFor(nodes, match.index, match.index + match[1].length).startContainer.parentElement?.closest('p');
			if (!target || target.paragraph === root) continue;
			const markerOffset = match.index + match[0].length - 1;
			rangeFor(nodes, markerOffset, markerOffset + 1).deleteContents();
			const range = rangeFor(nodes, match.index, match.index + match[1].length);
			const link = range.startContainer.ownerDocument.createElement('a');
			link.setAttribute('href', `#${target.id}`);
			link.style.textDecoration = 'underline';
			link.append(range.extractContents());
			range.insertNode(link);
		}
	}
}

/**
 * Add internal links to definition terms in clauses and included information sections.
 * The definitions annex supplies canonical labels; the JSON map supplies approved aliases.
 * Known underlined terms link with or without a marker. Asterisks are removed only when a
 * starred term resolves, while unresolved starred terms are returned for diagnostics.
 * Definition paragraphs themselves become keyboard-focusable destinations. The returned
 * arrays contain copied records, keeping the caller's source documents unchanged.
 * @param {{clauses: object[], annex: object[], intro?: object[], language?: 'en'|'fr'}} input
 * @returns {{clauses: object[], annex: object[], intro: object[], unresolved: object[]}}
 */
module.exports = function linkDefinitions({ clauses, annex, intro = [], language = 'en' }) {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	const clauseCopies = clauses.map(copy);
	const annexCopies = annex.map(copy);
	const introCopies = intro.map(copy);
	const sources = annexCopies.filter((item) => /^Annex.*Definition/iu.test(item.name));
	if (!sources.length) return { clauses: clauseCopies, annex: annexCopies, intro: introCopies, unresolved: [] };
	const documents = [...annexCopies, ...introCopies].map((item) => ({ item, fragment: JSDOM.fragment(item[bodyField] || '') }));
	const definitionDocuments = documents.filter(({ item }) => /^Annex.*Definition/iu.test(item.name));
	const catalog = new Map();
	const canonicalEntries = [];
	const reserved = new Set();
	for (const item of [...clauseCopies, ...annexCopies, ...introCopies]) {
		const fragment = JSDOM.fragment(item[descriptionField] || item[bodyField] || '');
		for (const element of fragment.querySelectorAll('[id], a[name]')) {
			if (element.id) reserved.add(element.id);
			if (element.getAttribute('name')) reserved.add(element.getAttribute('name'));
		}
	}
	// Build stable destinations from canonical definition labels before resolving aliases.
	for (const { fragment } of definitionDocuments) {
		for (const entry of definitionParagraphs(fragment)) {
			const key = normalize(entry.label);
			const existing = entry.paragraph.querySelector('a[id][name], span[id] > a[name]');
			const existingTarget = existing && (existing.id ? existing : existing.parentElement);
			let id;
			if (existingTarget && existing.getAttribute('name') === existingTarget.id && normalize(existingTarget.textContent.replace(/\*\s*$/u, '')) === key) {
				id = existingTarget.id;
			} else {
				const slug = key.normalize('NFD').replace(/[^a-z0-9]+/gu, '_').slice(0, 18);
				const hash = createHash('sha256').update(key).digest('hex').slice(0, 8);
				const base = `def_${language}_${slug}_${hash}`;
				id = base;
				let suffix = 2;
				while (reserved.has(id)) id = `${base}_${suffix++}`;
				reserved.add(id);
				const range = rangeFor(textNodes(entry.paragraph), 0, entry.colon);
				range.setStart(entry.paragraph, 0);
				while (range.endContainer !== entry.paragraph) {
					const endNode = range.endContainer;
					const length = endNode.nodeType === 3 ? endNode.textContent.length : endNode.childNodes.length;
					if (range.endOffset !== length) break;
					range.setEndAfter(endNode);
				}
				const anchor = entry.paragraph.ownerDocument.createElement('a');
				anchor.id = id;
				anchor.setAttribute('name', id);
				anchor.setAttribute('tabindex', '-1');
				anchor.setAttribute('style', 'color: black; font-weight: bold; text-decoration: none;');
				const content = range.extractContents();
				if (content.querySelector('a')) {
					const target = entry.paragraph.ownerDocument.createElement('span');
					target.id = id;
					target.setAttribute('tabindex', '-1');
					target.setAttribute('style', 'color: black; font-weight: bold; text-decoration: none;');
					anchor.removeAttribute('id');
					anchor.removeAttribute('tabindex');
					target.append(anchor, content);
					range.insertNode(target);
				} else {
					anchor.append(content);
					range.insertNode(anchor);
				}
				entry.paragraph.setAttribute('tabindex', '-1');
			}
			const target = { id, paragraph: entry.paragraph };
			canonicalEntries.push({ label: entry.label, target });
		}
	}
	const canonicalKeys = new Set();
	for (const { label, target } of canonicalEntries) {
		const key = normalize(label);
		if (!canonicalKeys.has(key)) addCatalogTerm(catalog, key, target, new Set());
		else {
			const existing = catalog.get(key);
			if (existing && (existing.id !== target.id || existing.paragraph !== target.paragraph)) catalog.set(key, null);
		}
		canonicalKeys.add(key);
	}
	for (const { label, target } of canonicalEntries) {
		for (const alias of aliases(label)) addCatalogTerm(catalog, alias, target, canonicalKeys);
	}
	for (const [canonical, mapping] of Object.entries(definitionMappings[language] || {})) {
		const target = catalog.get(normalize(canonical));
		if (!target) continue;
		for (const alias of mapping.aliases || []) addCatalogTerm(catalog, alias, target, canonicalKeys);
	}
	// Longest-first matching avoids a shorter alias consuming the start of a longer term.
	const alternatives = [...catalog.keys()].sort((left, right) => right.length - left.length).map(termPattern);
	const matcher = alternatives.length ? new RegExp(`(?<![\\p{L}\\p{N}_-])(${alternatives.join('|')})(\\s*)\\*`, 'giu') : null;
	const unresolved = [];
	for (const { item, fragment } of documents) {
		transform(fragment, catalog, item.name, unresolved, matcher);
		item[bodyField] = serialize(fragment);
	}
	for (const clause of clauseCopies) {
		const fragment = JSDOM.fragment(clause[descriptionField] || '');
		transform(fragment, catalog, clause.number, unresolved, matcher);
		clause[descriptionField] = serialize(fragment);
	}
	return { clauses: clauseCopies, annex: annexCopies, intro: introCopies, unresolved };
};