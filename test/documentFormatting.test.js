const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const formatDocument = require('../controllers/documentFormatting');

const parse = (html) => new JSDOM(html).window.document;

test('preserves the database-provided Part B heading without inventing or restyling content', () => {
	const source = '<div class="infoHeading"><h2>Part B - Functional Accessibility Requirements</h2></div>' +
		'<div class="infoBody"><h3><span style="mso-bidi-font-size:10pt">Explanation of the table</span></h3><p>The table consists of a single column which contains the following key information:</p>' +
		'<ul><li>The clause from EN 301 549.</li></ul></div>';
	const first = formatDocument(source);
	const document = parse(first);
	const heading = document.querySelector('.infoBody > h3');
	assert.equal(heading.textContent, 'Explanation of the table');
	assert.equal(heading.outerHTML, parse(source).querySelector('h3').outerHTML);
	assert(heading.nextElementSibling.textContent.startsWith('The table consists'));
	assert.equal(formatDocument(first), first);
	const missing = source.replace(parse(source).querySelector('h3').outerHTML, '');
	assert.equal(parse(formatDocument(missing)).querySelectorAll('h3').length, 0);
});

test('preserves unstyled English and French notes, spacing, links and Word declarations', () => {
	const source = '<p style="mso-ansi-language:EN-CA;color:black">NOTE 1:&nbsp;&nbsp; Text that wraps.</p>' +
		'<table><tr><td><p>NOTE 2:\tSee <a href="#definition">closed functionality</a>.</p></td></tr></table>' +
		'<p>REMARQUE 12 : Une note.</p>';
	const document = parse(formatDocument(source));
	assert.equal(document.body.innerHTML, parse(source).body.innerHTML);
});

test('preserves fully styled database notes including original tab spacing and Word declarations', () => {
	const source = '<p style="margin-left:5em;text-indent:-5em;tab-stops:5em">NOTE:<span style="mso-tab-count: 1;">&nbsp;&nbsp; </span>Existing note.</p>';
	const first = formatDocument(source);
	const second = formatDocument(first);
	assert.equal(second, first);
	const paragraph = parse(second).querySelector('p');
	assert.equal(paragraph.outerHTML, parse(source).querySelector('p').outerHTML);
	assert.equal(paragraph.style.marginLeft, '5em');
	assert.equal(paragraph.querySelectorAll('span').length, 1);
});

test('preserves partial note styling without filling in missing properties', () => {
	const source = '<p style="margin-left:6em">NOTE 1: Note.</p><p style="text-indent:-4em">NOTE 2: Note.</p>';
	assert.equal(parse(formatDocument(source)).body.innerHTML, parse(source).body.innerHTML);
});

test('preserves colonless numbered notes and their original whitespace without adding styles', () => {
	const source = '<p>NOTE 4 \tFor more information, see <a href="#reference">[i.70]</a>*.</p>';
	const first = formatDocument(source);
	const paragraph = parse(first).querySelector('p');
	assert.equal(paragraph.outerHTML, parse(source).querySelector('p').outerHTML);
	assert.equal(paragraph.getAttribute('style'), null);
	assert.equal(paragraph.querySelector('a').getAttribute('href'), '#reference');
	assert.equal(formatDocument(first), first);
});

test('preserves all source lists, numbering, empty items and bookmark destinations', () => {
	const source = '<ul><li>First</li><li><ol start="4"><li>Fourth</li><li>Fifth</li></ol></li></ul>' +
		'<ul id="list-target"><li><ul><li>Text</li></ul></li></ul>' +
		'<ul><li id="item-target">&nbsp;</li><li><span id="span-target"></span></li><li>&nbsp;</li></ul>';
	const document = parse(formatDocument(source));
	assert.equal(document.body.innerHTML, parse(source).body.innerHTML);
	assert.equal(document.querySelector('ol').getAttribute('start'), '4');
	assert.deepEqual(Array.from(document.querySelector('ol').children).map((item) => item.textContent), ['Fourth', 'Fifth']);
	for (const id of ['list-target', 'item-target', 'span-target']) assert(document.getElementById(id));
});

test('preserves database table styling, captions, explanatory text and number formatting', () => {
	const source = '<div class="infoHeading"><h2>Annex - Tables and figures</h2></div><div class="infoBody">' +
		'<p style="text-align:center"><strong>Table 5.1</strong></p><table style="background:white;width:409px"><tr><th><span style="color:black;font-size:11pt">Viewing distance (mm)</span></th><th>x-height (mm)</th></tr><tr><td>10.000</td><td>59,52</td></tr></table>' +
		'<p><strong>Table 5.1.4: Functionality closed to text enlargement</strong> (this tool cannot replicate this inside the clause).</p><table id="other"><tr><td>Other table</td></tr></table></div>';
	const document = parse(formatDocument(source));
	assert.equal(document.querySelector('.infoBody').innerHTML, parse(source).querySelector('.infoBody').innerHTML);
	assert.equal(formatDocument(formatDocument(source)), formatDocument(source));
});

test('bounds image dimensions to the printable page proportionally and retains alt text', () => {
	const source = '<img src="data:image/png;base64,example" width="866" height="491" alt="Wheelchair reach diagram">';
	const portrait = parse(formatDocument(source)).querySelector('img');
	assert.equal(portrait.getAttribute('width'), '664');
	assert.equal(portrait.getAttribute('height'), '376');
	assert.equal(portrait.style.width, '498pt');
	assert.equal(portrait.getAttribute('alt'), 'Wheelchair reach diagram');
	assert.equal(formatDocument(formatDocument(source)), formatDocument(source));
	const landscape = parse(formatDocument(source, { orientation: 'landscape' })).querySelector('img');
	assert.equal(landscape.getAttribute('width'), '866');
	assert.equal(landscape.getAttribute('height'), '491');
});

test('leaves production-sized images untouched when they fit the printable page', () => {
	const source = '<img src="data:image/png;base64,example" width="458" height="412" style="display:block;margin-left:auto;margin-right:auto" alt="Wheelchair reach diagram">';
	assert.equal(parse(formatDocument(source)).querySelector('img').outerHTML, parse(source).querySelector('img').outerHTML);
});