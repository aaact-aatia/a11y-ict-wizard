const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const pug = require('pug');
const { JSDOM } = require('jsdom');
const linkTableFigures = require('../controllers/tableFigureLinks');

function sample(language = 'en') {
	const descriptionField = language === 'fr' ? 'frDescription' : 'description';
	const complianceField = language === 'fr' ? 'frCompliance' : 'compliance';
	const bodyField = language === 'fr' ? 'frBodyHtml' : 'bodyHtml';
	return {
		clauses: [{
			number: '8.3.3.1',
			[descriptionField]: '<p>See Figure 8.1 and <strong>Table 10.2</strong>.</p><p><strong>Table 10.2: Reflow</strong></p>',
			[complianceField]: ''
		}],
		annex: [{
			name: 'Annex - Tables and figures (from EN 301 549)',
			[bodyField]: '<figure><img src="figure.png" alt="Reach diagram"></figure><p><strong>Figure 8.1: Unobstructed forward reach</strong></p><p><strong>Figure 8.10: Separate figure</strong></p>'
		}],
		intro: [],
		language
	};
}

test('links figure and table citations to exact included captions without mutating input', () => {
	const input = sample();
	const original = JSON.stringify(input);
	const result = linkTableFigures(input);
	const clause = new JSDOM(result.clauses[0].description).window.document;
	const links = [...clause.querySelectorAll('a[href^="#"]')];

	assert.equal(JSON.stringify(input), original);
	assert.deepEqual(links.map((link) => link.textContent), ['Figure 8.1', 'Table 10.2']);
	assert.equal(clause.querySelector('p strong')?.getAttribute('id'), null);
	const tableCaption = clause.querySelector('p:nth-of-type(2)');
	assert.equal(tableCaption.id, 'table_10_2');
	assert.equal(tableCaption.getAttribute('tabindex'), '-1');
	const annex = new JSDOM(result.annex[0].bodyHtml).window.document;
	assert.equal(annex.querySelector('#figure_8_1')?.textContent, 'Figure 8.1: Unobstructed forward reach');
	assert.equal(annex.querySelector('#figure_8_10')?.textContent, 'Figure 8.10: Separate figure');
});

test('links French figure and table labels and leaves absent targets unchanged', () => {
	const input = sample('fr');
	input.clauses[0].frDescription = '<p>Voir la figure 8.1 et le tableau 8.1*; le tableau 8.2.</p>';
	input.annex[0].frBodyHtml = '<p><strong>Figure 8.1 : Portée avant</strong></p><p><strong>Tableau 8.1 : Valeurs de portée</strong></p>';
	const result = linkTableFigures({ ...input, language: 'fr' });
	const document = new JSDOM(result.clauses[0].frDescription).window.document;

	assert.equal(document.querySelector('a')?.textContent, 'figure 8.1');
	assert.equal(document.querySelector('a[href="#table_8_1"]')?.textContent, 'tableau 8.1');
	assert.equal(document.querySelectorAll('a').length, 2);
	assert.equal(document.body.textContent, 'Voir la figure 8.1 et le tableau 8.1; le tableau 8.2.');
});

test('links table citations inside figure captions and removes their asterisk markers', () => {
	const result = linkTableFigures({
		clauses: [],
		intro: [],
		annex: [{
			name: 'Annex - Tables and figures',
			bodyHtml: '<p><strong>Figure 8.1: Obstructed side reach (see <u>Table 8.1</u>* for explanations)</strong></p><p><strong>Table 8.1: Obstruction values</strong></p><p><strong>Figure 8.2: Knee clearance (see <span style="text-decoration: underline;">Table 8.2</span>* for explanations)</strong></p><p><strong>Table 8.2: Knee clearance values</strong></p>'
		}]
	});
	const document = new JSDOM(result.annex[0].bodyHtml).window.document;
	const figureCaptions = [...document.querySelectorAll('p')].filter((paragraph) => /^Figure 8\.[12]:/u.test(paragraph.textContent));

	assert.equal(figureCaptions[0].querySelector('a[href="#table_8_1"]')?.textContent, 'Table 8.1');
	assert.equal(figureCaptions[0].textContent, 'Figure 8.1: Obstructed side reach (see Table 8.1 for explanations)');
	assert.equal(figureCaptions[1].querySelector('a[href="#table_8_2"]')?.textContent, 'Table 8.2');
	assert.equal(figureCaptions[1].textContent, 'Figure 8.2: Knee clearance (see Table 8.2 for explanations)');
});

test('full-document downloads link figure references and render their annex destinations', async (context) => {
	const async = require('async');
	const controller = require('../controllers/generatorController');
	const results = {
		fps: [{ number: '8.3.3.1', name: 'Forward reach', frName: 'Portée avant', description: '<p>See Figure 8.1.</p>', frDescription: '<p>Voir la figure 8.1.</p>', compliance: '', frCompliance: '', informative: false }],
		questionsSelected: [],
		intro: [{ name: 'Part A', frName: 'Partie A', bodyHtml: '', frBodyHtml: '' }],
		annex: [{
			name: 'Annex - Tables and figures (from EN 301 549)',
			frName: 'Annexe – Tableaux et figures (de la norme EN 301 549)',
			showHeading: true,
			bodyHtml: '<p><strong>Figure 8.1: Forward reach</strong></p>',
			frBodyHtml: '<p><strong>Figure 8.1 : Portée avant</strong></p>'
		}]
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
		assert.equal(document.querySelector('a[href="#figure_8_1"]')?.textContent, language === 'fr' ? 'figure 8.1' : 'Figure 8.1');
		assert.equal(document.querySelectorAll('#figure_8_1').length, 1);
	}
});