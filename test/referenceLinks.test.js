const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const linkReferences = require('../controllers/referenceLinks');

function links(html) {
	return Array.from(JSDOM.fragment(html).querySelectorAll('a[href^="#ref_"]'));
}

function sample(language = 'en') {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	return {
		clauses: [{ number: '5.1.4', [descriptionField]: '<p>See [<u>i.70</u>]* and <u>[i.71]</u>*; unknown <u>[i.99]</u>*.</p>' }],
		intro: [{ name: 'Part A - Functional Performance Criteria', [bodyField]: '<p>See <u>[i.70]</u>*.</p>' }],
		annex: [{
			name: 'Annex - References',
			frName: 'Annexe - Références',
			[bodyField]: '<p>[2] Reference 2.</p><p>[i.70] Reference 70.</p><p>[i.71] Reference 71.</p>'
		}],
		language
	};
}

test('links numeric and [i.number] citations and preserves unknown citations', () => {
	const input = sample();
	input.clauses[0].description = input.clauses[0].description.replace('See [<u>i.70</u>]*', 'See <u>[2]</u>* and [<u>i.70</u>]*');
	const linked = linkReferences(input);
	const output = linked.clauses[0].description;
	const citationLinks = links(output);

	assert.deepEqual(citationLinks.map((link) => link.textContent), ['[2]', '[i.70]', '[i.71]']);
	assert.equal(JSDOM.fragment(output).textContent, 'See [2] and [i.70] and [i.71]; unknown [i.99]*.');
	assert.deepEqual(linked.unresolved.map((entry) => entry.reference), ['[i.99]']);
	for (const link of citationLinks) {
		const id = link.getAttribute('href').slice(1);
		const destination = JSDOM.fragment(linked.annex[0].bodyHtml).querySelector(`[id="${id}"]`);
		assert(destination);
		assert.equal(destination.textContent, link.textContent);
		assert.equal(destination.getAttribute('name'), id);
	}
});

test('links citations with a closing bracket after the asterisk', () => {
	const result = linkReferences({
		clauses: [{ number: '6.2.10', description: '<p>Uses ETSI TS 126 114 <u>[i.11</u>*] for RTT.</p>' }],
		annex: [{ name: 'Annex - References', bodyHtml: '<p>[i.11] ETSI reference.</p>' }]
	});
	const output = result.clauses[0].description;
	const citationLink = links(output)[0];

	assert.equal(citationLink.textContent, '[i.11]');
	assert.equal(JSDOM.fragment(output).textContent, 'Uses ETSI TS 126 114 [i.11] for RTT.');
	assert.deepEqual(result.unresolved, []);
});

test('links citations in English and French info sections and is idempotent', () => {
	for (const language of ['en', 'fr']) {
		const first = linkReferences(sample(language));
		const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
		const clauseField = language === 'fr' ? 'frDescription' : 'description';
		assert.equal(links(first.intro[0][bodyField])[0].textContent, '[i.70]');
		const second = linkReferences({ ...first, language });
		assert.deepEqual(second.clauses, first.clauses);
		assert.deepEqual(second.annex, first.annex);
		assert.deepEqual(second.intro, first.intro);
		assert.equal(JSDOM.fragment(second.clauses[0][clauseField]).querySelectorAll('a[href^="#ref_"]').length, 2);
	}
});

test('links only indexed numeric references without mutating source objects', () => {
	const input = sample();
	input.clauses[0].description = '<p><u>[2]</u>* and <u>[i.99]</u>.</p>';
	const original = JSON.stringify(input);
	const result = linkReferences(input);

	assert.equal(JSON.stringify(input), original);
	assert.equal(links(result.clauses[0].description)[0].textContent, '[2]');
	assert([...JSDOM.fragment(result.clauses[0].description).querySelectorAll('u')].some((element) => element.textContent === '[i.99]'));
	assert.deepEqual(result.unresolved, []);
});

test('full-document downloads render reference links while evaluation downloads stay unchanged', async (context) => {
	const async = require('async');
	const pug = require('pug');
	const path = require('node:path');
	const controller = require('../controllers/generatorController');
	const results = {
		fps: [{ number: '5.1.4', name: 'Closed functionality', frName: 'Fonction restreinte', description: '<p>See <u>[2]</u>* and [<u>i.70</u>]*.</p>', frDescription: '<p>Voir <u>[2]</u>* et <u>[i.70]</u>*.</p>', compliance: '', frCompliance: '', informative: false }],
		questionsSelected: [],
		intro: [{ bodyHtml: '', frBodyHtml: '' }],
		annex: [{ name: 'Annex - References', frName: 'Annexe - Références', showHeading: true, bodyHtml: '<h3>References</h3><p>[2] Reference 2.</p><p>[i.70] Reference 70.</p>', frBodyHtml: '<h3>Références</h3><p>[2] Référence 2.</p><p>[i.70] Référence 70.</p>' }]
	};
	context.mock.method(async, 'parallel', (operations, callback) => callback(null, { ...results }));

	for (const language of ['en', 'fr']) {
		for (const kind of ['full_not_fillable', 'evaluation']) {
			const template = `download_${kind}_${language}`;
			let output;
			await new Promise((resolve, reject) => controller.download({
				params: { template },
				body: { clauses: [], questions: '', format: 'html' }
			}, {
				setHeader() {},
				render(name, locals, callback) {
					assert.equal(name, template);
					callback(null, pug.renderFile(path.resolve(__dirname, '..', 'views', `${name}.pug`), { ...locals, moment: require('moment') }));
				},
				send(content) { output = content; resolve(); }
			}, reject));
			const document = new JSDOM(output).window.document;
			const referenceLinks = document.querySelectorAll('a[href^="#ref_"]');
			if (kind === 'evaluation') {
				assert.equal(referenceLinks.length, 0);
			} else {
				assert.equal(referenceLinks.length, 2);
				assert.deepEqual(Array.from(referenceLinks).map(link => link.textContent), ['[2]', '[i.70]']);
				for (const reference of referenceLinks) assert.equal(document.querySelectorAll(reference.getAttribute('href')).length, 1);
			}
		}
	}
});