const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

process.env.BASICAUTHUSERNAME = 'test-user';
process.env.BASICAUTHPASSWORD = 'test-password';

const async = require('async');
const express = require('express');
const session = require('express-session');

const fixtures = {
	fps: [
		{ number: '6.2.1', name: 'Real-time text', frName: 'Texte en temps réel', description: '<p class="MsoNormal" style="margin: 0">Requirement <span lang="fr-CA">texte</span>.</p>', frDescription: '<p class="MsoNormal">Exigence <span lang="en-CA">text</span>.</p>', compliance: '', frCompliance: '', informative: false },
		{ number: '5.1.4', name: 'Closed functionality', frName: 'Fonction restreinte', description: '<p>See <u>clause 6.2.1</u>*.</p>', frDescription: '<p>Voir la clause <u>6.2.1</u>*.</p>', compliance: '', frCompliance: '', informative: false }
	],
	intro: [
		{ name: 'Part A', bodyHtml: '<p style="color: red"><span>Intro</span></p>', frBodyHtml: '<p style="color: red"><span>Intro</span></p>' },
		{ name: 'Part A – 4.2 Functional Performance Criteria', bodyHtml: '<p><strong>4.2.1 Usage without vision</strong></p>', frBodyHtml: '<p><strong>4.2.1 Utilisation sans vision</strong></p>' }
	],
	annex: [{ name: 'Annex - References', frName: 'Annexe - Références', showHeading: true, bodyHtml: '<h3>References</h3><table><tr><td nowrap><u>4.2.1</u>*</td></tr></table>', frBodyHtml: '<h3>Références</h3><table><tr><td nowrap><u>4.2.1</u>*</td></tr></table>' }]
};

function createApp() {
	const app = express();
	app.locals.moment = require('moment');
	app.set('views', path.resolve(__dirname, '..', 'views'));
	app.set('view engine', 'pug');
	app.use(express.urlencoded({ extended: false }));
	app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
	app.use('/edit', require('../routes/editRoutes'));
	return app;
}

async function withServer(callback) {
	const server = createApp().listen(0);
	await new Promise((resolve) => server.once('listening', resolve));
	try {
		await callback(`http://127.0.0.1:${server.address().port}`);
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

async function login(base) {
	const response = await fetch(`${base}/edit/login`, {
		method: 'POST',
		redirect: 'manual',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ username: 'test-user', password: 'test-password' })
	});
	assert.equal(response.status, 302);
	return response.headers.get('set-cookie').split(';')[0];
}

for (const language of ['en', 'fr']) {
	test(`GET /edit/export/${language} requires authentication and returns clean linked HTML`, async (context) => {
		const queried = [];
		context.mock.method(async, 'parallel', (operations, callback) => {
			queried.push(...Object.keys(operations));
			callback(null, structuredClone(fixtures));
		});

		await withServer(async (base) => {
			const anonymous = await fetch(`${base}/edit/export/${language}`, { redirect: 'manual' });
			assert.equal(anonymous.status, 302);
			assert.equal(anonymous.headers.get('location'), '/edit/login');
			assert.deepEqual(queried, []);

			const cookie = await login(base);
			const response = await fetch(`${base}/edit/export/${language}`, { headers: { cookie } });
			assert.equal(response.status, 200);
			assert.match(response.headers.get('content-type'), /^text\/html; charset=utf-8/u);
			assert.match(response.headers.get('content-disposition'), /^attachment; filename=".+\.html"$/u);
			assert.deepEqual(queried, ['fps', 'intro', 'annex']);

			const inline = await fetch(`${base}/edit/export/${language}?view`, { headers: { cookie } });
			assert.equal(inline.status, 200);
			assert.equal(inline.headers.get('content-disposition'), null);
			assert.match(inline.headers.get('content-type'), /^text\/html/u);

			const html = await response.text();
			assert.doesNotMatch(html, /^---/mu);
			const document = new JSDOM(html).window.document;
			assert.equal(document.documentElement.lang, language);
			assert.equal(document.querySelectorAll('[style], [class]:not(table, ul, body), style, [nowrap], [tabindex="-1"], [valign], [align], h1').length, 0);
			assert.equal(document.querySelector('table').className, 'table table-striped table-hover');
			assert.doesNotMatch(html, /\n\s*\n/u);

			const internalLinks = [...document.querySelectorAll('a[href^="#"]')];
			assert.ok(internalLinks.length >= 2);
			for (const link of internalLinks) {
				const id = decodeURIComponent(link.getAttribute('href').slice(1));
				const target = document.getElementById(id);
				assert.ok(target, `missing target for #${id}`);
				if (target.tagName === 'A') assert.equal(target.getAttribute('name'), id);
			}
			assert.ok(document.querySelector('a[href="#clause_6_2_1"]'));
			assert.ok(document.querySelector('a[href="#clause_4_2_1"]'));

			const otherLanguage = language === 'fr' ? 'en-CA' : 'fr-CA';
			assert.equal(document.querySelectorAll(`span[lang="${otherLanguage}"]`).length, 1);
			assert.equal(document.querySelectorAll('span:not([lang])').length, 0);
		});
	});
}
