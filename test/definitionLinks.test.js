const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const linkDefinitions = require('../controllers/definitionLinks');

function generate(description, definitions, language = 'en') {
	return linkDefinitions({
		clauses: [{ number: '5.1.4', description, frDescription: description }],
		annex: [{ name: 'Annex - Definition of terms', bodyHtml: `<h3>3.1 Terms</h3>${definitions}`, frBodyHtml: `<h3>3.1 Termes</h3>${definitions}` }],
		language
	});
}

function links(html) {
	return Array.from(JSDOM.fragment(html).querySelectorAll('a[href]'));
}

const englishDefinitions = '<p><strong>closed functionality:</strong> access limited by <u>assistive technology</u>*.</p>' +
	'<p><strong>platform software (platform):</strong> software.</p>' +
	'<p><strong>Assistive Technology (AT):</strong> support for closed functionality*.</p>';

test('definition destinations are black and bold while clickable references remain blue', () => {
	const fs = require('node:fs');
	const path = require('node:path');
	const result = generate('<p><u>platform</u>*.</p>', englishDefinitions);
	for (const format of ['html', 'docx']) {
		const css = fs.readFileSync(path.resolve(__dirname, '..', 'views', `download_${format}.css`), 'utf8');
		const dom = new JSDOM(`<html><head><style>${css}</style></head><body>${result.clauses[0].description}${result.annex[0].bodyHtml}</body></html>`);
		for (const target of dom.window.document.querySelectorAll('a[name]')) {
			assert.equal(target.hasAttribute('href'), false);
			assert.equal(dom.window.getComputedStyle(target).color, 'rgb(0, 0, 0)');
			assert.equal(dom.window.getComputedStyle(target).fontWeight, 'bold');
			assert.equal(dom.window.getComputedStyle(target).textDecoration, 'none');
		}
		for (const reference of dom.window.document.querySelectorAll('a[href]')) {
			assert.equal(dom.window.getComputedStyle(reference).color, 'rgb(5, 99, 193)');
		}
		dom.window.close();
	}
});

test('links the three clause terms and marked definition cross-references without changing source text', () => {
	const description = '<p>Where <u>closed functionality</u>*, <span style="text-decoration: underline"><em>platform</em></span>* or <u>assistive technology</u>* applies, see <u>[i.70]</u>*.</p>';
	const result = generate(description, englishDefinitions);
	const output = result.clauses[0].description;
	assert.deepEqual(links(output).map((link) => link.textContent), ['closed functionality', 'platform', 'assistive technology']);
	assert.equal(JSDOM.fragment(output).textContent, 'Where closed functionality, platform or assistive technology applies, see [i.70]*.');
	assert.equal(links(output)[1].querySelector('em').textContent, 'platform');
	assert.equal(links(result.annex[0].bodyHtml).length, 2);
	const targets = JSDOM.fragment(result.annex[0].bodyHtml);
	for (const link of [...links(output), ...links(result.annex[0].bodyHtml)]) {
		const target = targets.querySelector(link.getAttribute('href'));
		assert(target);
		assert.equal(target.getAttribute('name'), target.id);
		assert.equal(target.getAttribute('tabindex'), '-1');
		assert.equal(target.querySelectorAll('a').length, 0);
	}
	assert.deepEqual(result.unresolved, []);
});

test('handles French accents, apostrophes, NBSP and colon placement without translating', () => {
	const result = generate('<p><u>TECHNOLOGIE D\u2019AIDE</u>\u00a0* et plateforme*.</p>',
		'<p><strong>Technologie d\u2019aide (TA)\u00a0:\u00a0</strong>support.</p><p><strong>Logiciel de plateforme (plateforme):</strong> logiciel.</p>', 'fr');
	assert.deepEqual(links(result.clauses[0].frDescription).map((link) => link.textContent), ['TECHNOLOGIE D\u2019AIDE', 'plateforme']);
	assert.equal(result.clauses[0].description, '<p><u>TECHNOLOGIE D\u2019AIDE</u>\u00a0* et plateforme*.</p>');
	assert(links(result.clauses[0].frDescription).every((link) => link.getAttribute('href').startsWith('#def_fr_')));
});

test('links configured definition aliases in English and French', () => {
	const english = linkDefinitions({
		clauses: [{ number: '5.2', description: '<p><span style="text-decoration: underline;">documented </span><u>accessibility features</u>*.</p>' }],
		annex: [{ name: 'Annex - Definition of terms', bodyHtml: '<h3>3.1 Terms</h3><p><strong>documented accessibility feature:</strong> feature details.</p>' }],
		language: 'en'
	});
	const french = linkDefinitions({
		clauses: [{ number: '5.2', frDescription: '<p><u>caractéristiques d’accessibilité </u><span style="text-decoration: underline;">documentées</span>*.</p>' }],
		annex: [{ name: 'Annex - Definition of terms', frBodyHtml: '<h3>3.1 Termes</h3><p><span style="mso-bookmark:target"><strong><span lang="FR-CA">caractéristique d’accessibilité documentée</span></strong></span>: détails.</p>' }],
		language: 'fr'
	});

	assert.equal(links(english.clauses[0].description)[0].textContent, 'documented accessibility features');
	assert.equal(links(french.clauses[0].frDescription)[0].textContent, 'caractéristiques d’accessibilité documentées');
	assert.equal(links(english.clauses[0].description)[0].querySelectorAll('u, span[style]').length, 2);
	assert.equal(links(french.clauses[0].frDescription)[0].querySelectorAll('u, span[style]').length, 2);
	assert.deepEqual(english.unresolved, []);
	assert.deepEqual(french.unresolved, []);
});

test('links plural menu and relay-user aliases to their definitions', () => {
	const english = linkDefinitions({
		clauses: [{ number: '13.1.1', description: '<p><u>primary users</u>*.</p>' }],
		annex: [{ name: 'Annex - Definition of terms', bodyHtml: '<h3>3.1 Terms</h3><p><strong>primary user (of relay service):</strong> user details.</p>' }],
		language: 'en'
	});
	const french = linkDefinitions({
		clauses: [{ number: '10.3.2.1', frDescription: '<p><u>menus</u>*.</p>' }],
		annex: [{ name: 'Annex - Definition of terms', frBodyHtml: '<h3>3.1 Termes</h3><p><strong>menu:</strong> détails.</p>' }],
		language: 'fr'
	});

	assert.equal(links(english.clauses[0].description)[0].textContent, 'primary users');
	assert.equal(links(french.clauses[0].frDescription)[0].textContent, 'menus');
	assert.deepEqual(english.unresolved, []);
	assert.deepEqual(french.unresolved, []);
});

test('links known underlined definitions without a marker and preserves unknown emphasis', () => {
	const result = generate('<p>Where ICT includes <u>a web page</u>, it can include <u>unknown emphasis</u>.</p>',
		'<p><strong>web page:</strong> resource obtained from a single URI.</p>');
	const output = result.clauses[0].description;

	assert.deepEqual(links(output).map((link) => link.textContent), ['a web page']);
	assert.equal(JSDOM.fragment(output).textContent, 'Where ICT includes a web page, it can include unknown emphasis.');
	assert([...JSDOM.fragment(output).querySelectorAll('u')].some((element) => element.textContent === 'unknown emphasis'));
	assert.deepEqual(result.unresolved, []);
});

test('removes definition markers and keeps a plural suffix outside the link', () => {
	const result = generate('<p><u>intégrés</u>*; <u>non intégrée*</u>; <u>non intégrée</u><em>&nbsp;*</em>; <u>menu</u>*s.</p>',
		'<p><strong>intégré:</strong> détails.</p><p><strong>menu:</strong> détails.</p>', 'fr');
	const output = result.clauses[0].frDescription;

	const linkedTerms = links(output);
	assert.deepEqual(linkedTerms.map((link) => link.textContent), ['intégrés', 'non intégrée', 'non intégrée', 'menu']);
	assert.equal(linkedTerms[3].nextSibling.textContent, 's.');
	assert.equal(JSDOM.fragment(output).textContent, 'intégrés; non intégrée; non intégrée\u00a0; menus.');
	assert.deepEqual(result.unresolved, []);
});

test('removes a definition marker after a possessive apostrophe', () => {
	const result = generate('<p><u>user interface elements</u>\'*</p>',
		'<p><strong>user interface element:</strong> details.</p>');
	const output = result.clauses[0].description;
	const link = links(output)[0];

	assert.equal(link.textContent, 'user interface elements');
	assert.equal(link.nextSibling.textContent, '\'');
	assert.equal(JSDOM.fragment(output).textContent, "user interface elements'");
	assert.deepEqual(result.unresolved, []);
});

test('preserves bracketed citation markers for the reference linker', () => {
	const result = generate('<p>See <u>[i.25]</u>*.</p>', englishDefinitions);
	assert.equal(JSDOM.fragment(result.clauses[0].description).textContent, 'See [i.25]*.');
});

test('links definition references in informative intro sections', () => {
	const result = linkDefinitions({
		clauses: [],
		intro: [{ name: 'Part A - Functional Performance Criteria', bodyHtml: '<h3>4.2.4 Usage without hearing</h3><p>Allowing use of <u>Assistive Listening Devices</u>* can contribute towards meeting this clause.</p>' }],
		annex: [{ name: 'Annex - Definition of terms', bodyHtml: '<h3>3.1 Terms</h3><p><strong>Assistive Listening Devices (ALDs):</strong> devices that separate wanted sounds from background noise.</p>' }],
		language: 'en'
	});
	const partA = result.intro[0];
	const link = links(partA.bodyHtml)[0];

	assert.equal(link.textContent, 'Assistive Listening Devices');
	assert.equal(JSDOM.fragment(partA.bodyHtml).textContent, '4.2.4 Usage without hearingAllowing use of Assistive Listening Devices can contribute towards meeting this clause.');
	assert.deepEqual(result.unresolved, []);
});

test('prefers an exact definition label over an inferred parenthetical alias', () => {
	const result = generate('<p><u>accessibility</u>*.</p>',
		'<p><strong>accessibility:</strong> general concept.</p><p><strong>applicable (accessibility) requirement:</strong> requirement.</p>');
	const reference = links(result.clauses[0].description)[0];
	const targets = JSDOM.fragment(result.annex[0].bodyHtml);
	assert.equal(targets.querySelector(reference.getAttribute('href')).textContent, 'accessibility');
	assert.deepEqual(result.unresolved, []);
});

test('preserves unknown, ambiguous, plural and existing linked terms', () => {
	const description = '<p><u>unknown term</u>*, <u>content</u>*, <u>documents</u>* and <a href="https://example.org"><u>platform</u>*</a>.</p>';
	const result = generate(description, '<p><strong>content:</strong> first.</p><p><strong>content:</strong> duplicate.</p><p><strong>document:</strong> single.</p>');
	const output = JSDOM.fragment(result.clauses[0].description);
	assert.equal(output.textContent, 'unknown term, content, documents and platform*.');
	assert([...output.querySelectorAll('u')].some((element) => element.textContent === 'unknown term'));
	assert.deepEqual(result.unresolved.map((entry) => entry.reason), ['missing', 'ambiguous', 'missing']);
	const targets = Array.from(JSDOM.fragment(result.annex[0].bodyHtml).querySelectorAll('a[id]'));
	assert.equal(new Set(targets.map((target) => target.id)).size, targets.length);
});

test('links markers inside styled elements and in adjacent formatted nodes', () => {
	const result = generate('<p><u>platform*</u> and <u>platform</u><em>\u00a0*</em>.</p>', englishDefinitions);
	assert.equal(links(result.clauses[0].description).length, 2);
	assert.equal(JSDOM.fragment(result.clauses[0].description).textContent, 'platform and platform\u00a0.');
});

test('links repeated plain markers across nested inline formatting', () => {
	const result = generate('<p>closed <em>functionality</em>* and closed functionality*, plus platform*.</p>', englishDefinitions);
	assert.equal(links(result.clauses[0].description).length, 3);
	assert.equal(links(result.clauses[0].description)[0].querySelector('em').textContent, 'functionality');
	assert.equal(JSDOM.fragment(result.clauses[0].description).textContent, 'closed functionality and closed functionality, plus platform.');
});

test('does not match substrings, unmarked terms, definition labels, references or table references', () => {
	const result = generate('<p>non-platform* platform, [i.70]* and Table 5.1.4*.</p>', englishDefinitions);
	assert.equal(links(result.clauses[0].description).length, 0);
	assert.equal(result.clauses[0].description, '<p>non-platform* platform, [i.70]* and Table 5.1.4*.</p>');
	assert.equal(JSDOM.fragment(result.annex[0].bodyHtml).querySelector('a[name]').querySelector('a'), null);
});

test('only indexes the terms section, not notes, introductions or abbreviations', () => {
	const result = generate('<p><u>Terms given in [i.5]</u>*, <u>NOTE</u>* and <u>AT</u>*.</p>',
		'<p>Terms given in [i.5]*:</p><p><strong>NOTE:</strong> text.</p><h3>3.3 Abbreviations</h3><p><strong>AT:</strong> technology.</p>');
	assert.equal(links(result.clauses[0].description).length, 0);
	assert.equal(JSDOM.fragment(result.annex[0].bodyHtml).querySelectorAll('a[id]').length, 0);
});

test('supports plain starred definition labels and preserves their labels', () => {
	const result = generate('<p><u>inspection tool</u>*.</p>', '<p>inspection tool*: a tool.</p>');
	assert.equal(links(result.clauses[0].description).length, 1);
	assert.equal(JSDOM.fragment(result.annex[0].bodyHtml).textContent, '3.1 Termsinspection tool*: a tool.');
	assert.equal(links(result.annex[0].bodyHtml).length, 0);
});

test('keeps inputs unchanged and produces stable, bounded Word-safe destinations', () => {
	const input = {
		clauses: [{ number: '5.1.4', description: '<p>platform*.</p>' }],
		annex: [{ name: 'Annex - Definition', bodyHtml: `<h3>3.1 Terms</h3>${englishDefinitions}` }]
	};
	const original = JSON.stringify(input);
	const first = linkDefinitions(input);
	assert.equal(JSON.stringify(input), original);
	const second = linkDefinitions({ clauses: first.clauses, annex: first.annex });
	assert.deepEqual(second.clauses, first.clauses);
	assert.deepEqual(second.annex, first.annex);
	assert.equal(links(first.clauses[0].description)[0].getAttribute('href'), links(linkDefinitions(input).clauses[0].description)[0].getAttribute('href'));
	for (const target of JSDOM.fragment(first.annex[0].bodyHtml).querySelectorAll('a[id]')) {
		assert.match(target.id, /^[a-z][a-z0-9_]*$/u);
		assert(target.id.length <= 40);
	}
});

test('does not generate links when the definitions annex is absent', () => {
	const result = linkDefinitions({ clauses: [{ description: '<p><u>platform</u>*.</p>' }], annex: [] });
	assert.equal(result.clauses[0].description, '<p><u>platform</u>*.</p>');
	assert.deepEqual(result.unresolved, []);
});

test('links unwrapped HTML fragments and does not match across block or existing-link boundaries', () => {
	const result = generate('platform*<p>closed</p><p>functionality*</p><p>closed <a href="https://example.org">functionality</a>*.</p>', englishDefinitions);
	assert.equal(links(result.clauses[0].description).filter((link) => link.getAttribute('href').startsWith('#')).length, 1);
	assert.equal(links(result.clauses[0].description)[0].textContent, 'platform');
});

test('avoids existing destination IDs and keeps starred labels with whitespace idempotent', () => {
	const definitions = '<p>inspection tool* : description.</p>';
	const first = generate('<p>inspection tool*.</p>', definitions);
	const destination = links(first.clauses[0].description)[0].getAttribute('href').slice(1);
	const collision = generate(`<p id="${destination}">inspection tool*.</p>`, definitions);
	assert.notEqual(links(collision.clauses[0].description)[0].getAttribute('href'), `#${destination}`);
	const repeated = linkDefinitions({ clauses: first.clauses, annex: first.annex });
	assert.deepEqual(repeated.annex, first.annex);
	assert.equal(JSDOM.fragment(repeated.annex[0].bodyHtml).querySelectorAll('a a').length, 0);
});

test('preserves existing label links and descendant links without generating nested anchors', () => {
	const description = '<p>platform* and <u>closed <a href="https://example.org/reference">functionality</a></u>*.</p>';
	const result = generate(description, '<p><strong><a href="https://example.org/platform">platform</a>:</strong> software.</p>');
	assert.equal(links(result.clauses[0].description).filter((link) => link.getAttribute('href').startsWith('#')).length, 1);
	assert(JSDOM.fragment(result.clauses[0].description).textContent.includes('closed functionality*'));
	assert.equal(links(result.annex[0].bodyHtml).find((link) => link.getAttribute('href').startsWith('https:')).textContent, 'platform');
	assert.doesNotMatch(result.annex[0].bodyHtml, /<a\b[^>]*>(?:(?!<\/a>).)*<a\b/su);
	assert.doesNotMatch(result.clauses[0].description, /<a\b[^>]*>(?:(?!<\/a>).)*<a\b/su);
	const destination = links(result.clauses[0].description)[0].getAttribute('href').slice(1);
	const fragment = JSDOM.fragment(result.annex[0].bodyHtml);
	assert.equal(fragment.querySelector(`[id="${destination}"]`).getAttribute('tabindex'), '-1');
	assert.equal(fragment.querySelectorAll(`a[name="${destination}"]`).length, 1);
	assert.deepEqual(linkDefinitions({ clauses: result.clauses, annex: result.annex }).annex, result.annex);
});

test('full-document downloads render working English and French links; evaluation downloads stay unchanged', async (context) => {
	const async = require('async');
	const pug = require('pug');
	const path = require('node:path');
	const controller = require('../controllers/generatorController');
	const results = {
		fps: [{ number: '5.1.4', name: 'Closed functionality', frName: 'Fonction restreinte', description: '<p><u>platform</u>*. Plain platform*.</p>', frDescription: '<p><u>plateforme</u>*. Logiciel de plateforme*.</p>', compliance: '', frCompliance: '', informative: false }],
		questionsSelected: [],
		intro: [{ bodyHtml: '', frBodyHtml: '' }],
		annex: [{ name: 'Annex - Definition of terms', frName: 'Annexe - Termes', showHeading: true, bodyHtml: `<h3>3.1 Terms</h3>${englishDefinitions}`, frBodyHtml: '<h3>3.1 Termes</h3><p><strong>Logiciel de plateforme (plateforme):</strong> logiciel.</p>' }]
	};
	const original = JSON.stringify(results);
	context.mock.method(async, 'parallel', (operations, callback) => callback(null, { ...results }));
	context.mock.method(require('html-docx-js'), 'asBlob', (html) => new Blob([html]));
	for (const language of ['en', 'fr']) {
		for (const kind of ['full_not_fillable', 'evaluation']) {
			for (const format of ['html', 'docx']) {
			const template = `download_${kind}_${language}`;
			let output;
			await new Promise((resolve, reject) => controller.download({
				params: { template },
				body: { clauses: [], questions: '', format }
			}, {
				setHeader() {},
				render(name, locals, callback) {
					assert.equal(name, template);
					callback(null, pug.renderFile(path.resolve(__dirname, '..', 'views', `${name}.pug`), { ...locals, moment: require('moment') }));
				},
				send(content) { output = content; resolve(); }
			}, reject));
			const document = new JSDOM(Buffer.isBuffer(output) ? output.toString('utf8') : output).window.document;
			const references = Array.from(document.querySelectorAll('a[href^="#def_"]'));
			assert.equal(document.documentElement.lang, language);
			if (kind === 'evaluation') {
				assert.equal(references.length, 0);
				assert.equal(document.querySelectorAll('a[name]').length, 0);
			} else {
				assert.equal(document.querySelectorAll('u').length, 0);
				assert(references.length > 0);
				for (const reference of references) {
					assert.doesNotMatch(reference.style.textDecoration + reference.style.textDecorationLine, /underline/iu);
				}
				for (const reference of references) {
					assert.equal(document.querySelectorAll(reference.getAttribute('href')).length, 1);
					assert(reference.getAttribute('href').startsWith(`#def_${language}_`));
				}
			}
			}
		}
	}
	assert.equal(JSON.stringify(results), original);
});