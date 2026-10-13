const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const cleanDocumentHtml = require('../controllers/cleanDocumentHtml');

const source = `<!DOCTYPE html>
<html lang="en"><head><title>Requirements</title><meta charset="utf-8"><style>p { color: red; }</style><link rel="stylesheet" href="x.css"></head>
<body><div class="WordSection1"><p class="MsoNormal" style="margin: 0">Intro <span style="font-size: 12pt">plain</span> <span lang="EN-CA" style="color: blue">same</span> <span lang="fr-CA">français</span> <span xml:lang="en" lang="en">both</span></p><p>Second</p>
<table class="table"><tr><td nowrap valign="top" width="104"><p align="center"><strong><a id="clause_5_1" name="clause_5_1" tabindex="-1" style="color: black">5.1 Clause</a></strong></p></td></tr></table>
<p>&nbsp;</p><p></p><p><strong></strong></p><p><a id="keep_me" name="keep_me"></a></p>
<p>See <a href="#clause_5_1" class="link">5.1</a> and <a href="https://example.com/">external</a>.</p>
<img src="figure.png" alt="Figure 1 description" style="width: 10px" width="10">
<div tabindex="0" style="">Focusable</div></div></body></html>`;

function clean(language = 'en') {
	return new JSDOM(cleanDocumentHtml(source, language)).window.document;
}

test('removes styles, classes, style elements and the WordSection1 wrapper', () => {
	const document = clean();
	assert.equal(document.querySelectorAll('[style], [class], style, .WordSection1').length, 0);
	assert.equal(document.body.firstElementChild.tagName, 'P');
});

test('keeps a minimal head and the page language', () => {
	const document = clean();
	assert.equal(document.documentElement.getAttribute('lang'), 'en');
	assert.deepEqual([...document.head.children].map((element) => element.tagName), ['META', 'META', 'TITLE']);
	assert.equal(document.querySelector('meta[charset]').getAttribute('charset'), 'utf-8');
	assert.equal(document.querySelector('meta[name="viewport"]').getAttribute('content'), 'width=device-width, initial-scale=1');
	assert.equal(document.title, 'Requirements');
});

test('unwraps plain and same-language spans but keeps other-language spans', () => {
	const document = clean();
	const spans = [...document.querySelectorAll('span')];
	assert.deepEqual(spans.map((span) => [span.getAttribute('lang'), span.textContent]), [['fr-CA', 'français']]);
	assert.equal(document.querySelector('p').textContent, 'Intro plain same français both');

	const french = clean('fr');
	assert.equal(french.documentElement.getAttribute('lang'), 'fr');
	assert.deepEqual([...french.querySelectorAll('span[lang]')].map((span) => span.textContent), ['same', 'both']);
});

test('removes nowrap and tabindex="-1" but keeps other tabindex values', () => {
	const document = clean();
	assert.equal(document.querySelectorAll('[nowrap], [tabindex="-1"]').length, 0);
	assert.equal(document.querySelectorAll('[tabindex="0"]').length, 1);
});

test('keeps anchors, hrefs, tables and image alt text', () => {
	const document = clean();
	const target = document.getElementById('clause_5_1');
	assert.equal(target.getAttribute('name'), 'clause_5_1');
	assert.equal(document.querySelector('a[href="#clause_5_1"]').textContent, '5.1');
	assert.ok(document.querySelector('a[href="https://example.com/"]'));
	assert.equal(document.querySelector('td').hasAttribute('valign'), false);
	assert.equal(document.querySelector('td').hasAttribute('width'), false);
	assert.equal(document.querySelector('p[align]'), null);
	assert.ok(document.getElementById('keep_me'));
	assert.equal(document.querySelector('img').getAttribute('alt'), 'Figure 1 description');
	assert.equal(document.querySelector('img').getAttribute('width'), '10');
});

test('starts each paragraph on its own line', () => {
	const output = cleanDocumentHtml(source, 'en');
	const paragraphs = output.match(/<p[\s>]/gu).length;
	assert.equal(paragraphs, 5);
	assert.equal(output.match(/\n<p[\s>]/gu).length, paragraphs);
});

test('keeps list numbering from inline list-style-type as an ol type', () => {
	const input = '<html><body><ol style="list-style-type: lower-alpha;"><li>a</li></ol><ol style="list-style-type: upper-roman"><li>b</li></ol><ol type="1" style="list-style-type: lower-alpha"><li>c</li></ol><ol style="list-style-type: decimal"><li>d</li></ol></body></html>';
	const lists = [...new JSDOM(cleanDocumentHtml(input, 'en')).window.document.querySelectorAll('ol')];
	assert.deepEqual(lists.map((list) => list.getAttribute('type')), ['a', 'I', '1', null]);
	assert.equal(lists.some((list) => list.hasAttribute('style')), false);
});
