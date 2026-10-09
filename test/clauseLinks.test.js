const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const pug = require('pug');
const { JSDOM } = require('jsdom');
const linkClauses = require('../controllers/clauseLinks');

function sample(language = 'en') {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const complianceField = language === 'fr' ? 'frCompliance' : 'compliance';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	return {
		clauses: [
			{ number: '5.1.4', name: 'Closed functionality', frName: 'Fonction restreinte', [descriptionField]: '<p>Self <u>clause 5.1.4</u>*; see <u>clause 6.2.1</u>* and <u>clause 9*</u>.</p>', [complianceField]: '' },
			{ number: '6.2.1', name: 'Real-time text', frName: 'Texte en temps réel', [descriptionField]: '<p>See <u>5.1.4</u>*.</p>', [complianceField]: '' },
			{ number: '9', name: 'Web', frName: 'Web', [descriptionField]: '<p>Web clause.</p>', [complianceField]: '' }
		],
		annex: [],
		intro: [
			{ name: 'Part A', [bodyField]: '<p>See <u>6.2.1</u>* and <u>clause 5.2</u>*.</p>' },
			{ name: 'Part A – 4.2 Functional Performance Criteria', [bodyField]: '<p><strong>4.2.1 Usage without vision</strong></p><p><strong>4.2.2 Usage with limited vision</strong></p>' }
		],
		language
	};
}

test('links underlined clause citations to included clause heading IDs', () => {
	const input = sample();
	const original = JSON.stringify(input);
	const result = linkClauses(input);
	const output = new JSDOM(result.clauses[0].description).window.document;
	const citations = [...output.querySelectorAll('a[href^="#clause_"]')];

	assert.equal(JSON.stringify(input), original);
	assert.equal(citations.length, 2);
	assert.deepEqual(citations.map((link) => link.textContent), ['clause 6.2.1', 'clause 9']);
	for (const link of citations) {
		assert(result.clauses.some((clause) => `#${clause.clauseLinkId}` === link.getAttribute('href')));
	}
	assert.equal(output.querySelector('u').textContent, 'clause 5.1.4');
	assert.equal(output.body.textContent, 'Self clause 5.1.4; see clause 6.2.1 and clause 9.');
	assert.equal(new JSDOM(result.intro[0].bodyHtml).window.document.querySelector('a[href="#clause_6_2_1"]').textContent, '6.2.1');
	const criteria = new JSDOM(result.intro[1].bodyHtml).window.document;
	assert.equal(criteria.getElementById('clause_4_2_1')?.textContent, '4.2.1 Usage without vision');
	assert.equal(criteria.querySelector('a[name="clause_4_2_1"]')?.id, 'clause_4_2_1');
	assert.deepEqual(linkClauses(result).intro, result.intro);
	assert.deepEqual(result.unresolved.map((item) => item.clause), ['clause 5.2']);
});

test('renders clause destinations in English and French clause tables', () => {
	for (const language of ['en', 'fr']) {
		const result = linkClauses(sample(language));
		const template = language === 'fr' ? 'table_not_fillable_fr.pug' : 'table_not_fillable.pug';
		const html = pug.renderFile(path.resolve(__dirname, '..', 'views', 'includes', template), { item_list: result.clauses });
		const document = new JSDOM(html).window.document;
		for (const clause of result.clauses) {
			const target = document.getElementById(clause.clauseLinkId);
			assert.equal(target?.textContent.trim(), `${clause.number} ${language === 'fr' ? clause.frName : clause.name}`);
			assert.equal(target.getAttribute('name'), clause.clauseLinkId);
		}
	}
});

test('full-document downloads connect clause citations to rendered headings', async (context) => {
	const async = require('async');
	const controller = require('../controllers/generatorController');
	const results = {
		fps: [
			{ number: '5.1.4', name: 'Closed functionality', frName: 'Fonction restreinte', description: '<p>See <u>clause 6.2.1</u>*.</p>', frDescription: '<p>Voir la clause <u>6.2.1</u>*.</p>', compliance: '', frCompliance: '', informative: false },
			{ number: '6.2.1', name: 'Real-time text', frName: 'Texte en temps réel', description: '<p>Requirement.</p>', frDescription: '<p>Exigence.</p>', compliance: '', frCompliance: '', informative: false }
		],
		questionsSelected: [],
		intro: [
			{ name: 'Part A', bodyHtml: '', frBodyHtml: '' },
			{ name: 'Part A – 4.2 Functional Performance Criteria', bodyHtml: '<p><strong>4.2.1 Usage without vision</strong></p>', frBodyHtml: '<p><strong>4.2.1 Utilisation sans vision</strong></p>' }
		],
		annex: [{ name: 'Annex - References', frName: 'Annexe - Références', showHeading: true, bodyHtml: '<h3>References</h3><table><tr><td><u>4.2.1</u>*</td></tr></table>', frBodyHtml: '<h3>Références</h3><table><tr><td><u>4.2.1</u>*</td></tr></table>' }]
	};
	context.mock.method(async, 'parallel', (operations, callback) => callback(null, { ...results }));

	for (const language of ['en', 'fr']) {
		const template = `download_full_not_fillable_${language}`;
		let output;
		await new Promise((resolve, reject) => controller.download({
			params: { template },
			body: { clauses: [], questions: '', format: 'html' }
		}, {
			setHeader() {},
			render(name, locals, callback) {
				assert.equal(name, template);
				callback(null, pug.renderFile(path.resolve(__dirname, '..', 'views', `${template}.pug`), { ...locals, moment: require('moment') }));
			},
			send(content) { output = content; resolve(); }
		}, reject));

		const document = new JSDOM(output).window.document;
		const link = document.querySelector('a[href="#clause_6_2_1"]');
		assert.equal(link?.textContent, language === 'fr' ? '6.2.1' : 'clause 6.2.1');
		assert.equal(document.querySelectorAll('#clause_6_2_1').length, 1);
		const criterionLink = document.querySelector('a[href="#clause_4_2_1"]');
		assert.equal(criterionLink?.textContent, '4.2.1');
		assert.equal(document.querySelectorAll('#clause_4_2_1').length, 1);
		// Word bookmarks: every internal link must target a named anchor.
		for (const internal of document.querySelectorAll('a[href^="#"]')) {
			const name = internal.getAttribute('href').slice(1);
			assert.equal(document.querySelectorAll(`a[name="${name}"]`).length, 1, name);
		}
	}
});

test('removes markers from self and unresolved clause citations without linking them', () => {
	const result = linkClauses({
		clauses: [{ number: '5.1.4', description: '<p><u>clause 5.1.4</u>* and <u>clause 6.2.1</u>*.</p>', compliance: '' }],
		annex: []
	});
	const document = new JSDOM(result.clauses[0].description).window.document;

	assert.equal(document.querySelectorAll('a').length, 0);
	assert.equal(document.body.textContent, 'clause 5.1.4 and clause 6.2.1.');
	assert.deepEqual(result.unresolved.map((item) => item.reason), ['missing']);
});

test('links plain starred clause references only when their target is included', () => {
	const result = linkClauses({
		clauses: [
			{ number: '8.3.10.3', description: '<p>See clause 8.3.11.1* and clause C.6*.</p>' },
			{ number: '8.3.11.1', description: '<p>Target clause.</p>' }
		],
		annex: []
	});
	const document = new JSDOM(result.clauses[0].description).window.document;
	const link = document.querySelector('a[href="#clause_8_3_11_1"]');

	assert.equal(link?.textContent, 'clause 8.3.11.1');
	assert.equal(document.body.textContent, 'See clause 8.3.11.1 and clause C.6*.');
});