const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const formatDatPage = require('../controllers/datPage');

const html = `<!DOCTYPE html><html lang="en"><head><title>Requirements</title></head><body>
<p>Generated 2026-10-13</p><h1>ICT accessibility requirements</h1>
<div><h2>Intro</h2></div><div><p>Body text with&nbsp;&nbsp;&nbsp;&nbsp; extra spaces and a single&nbsp;space.</p></div>
<table border="1" width="438" title="Named table"><thead><tr><td>Abbreviation</td><td>Criterion</td></tr></thead><thead></thead><tbody><tr><td>WV</td><td>Usage without vision</td></tr></tbody></table>
<p><strong>Table 5.1: Viewing distances</strong></p><table><tbody><tr><td>Viewing distance</td><td>Minimum text height</td></tr><tr><td>400 mm</td><td>2.38 mm</td></tr></tbody></table>
<table border="1" width="438"><thead><tr><th scope="col">Clause</th></tr></thead>
<tbody><tr><td><p><strong><a id="clause_5" name="clause_5">5 Generic requirements</a></strong></p></td></tr>
<tr><td><p><strong><a id="clause_5_1" name="clause_5_1">5.1 Closed</a></strong></p><p>See <a href="#def_en_access_space_1">access space</a>.</p></td></tr></tbody></table>
<h2>Annex - References (from EN 301 549)</h2>
<h3>2.1&nbsp; Normative references</h3>
<p>The following are necessary.</p>
<p><a id="ref_1" name="ref_1">[1]</a>&nbsp;&nbsp;&nbsp;&nbsp;Void.</p>
<p><a id="ref_2" name="ref_2">[2]</a>&nbsp;&nbsp;&nbsp;&nbsp;<a href="https://example.com/">ETSI ES 200</a>: "Telephony".</p>
<h2>Annex – Definition of terms</h2>
<h3>3.1&nbsp; Terms</h3>
<p>For the purposes of the present document, the following apply:</p>
<p><a id="def_en_access_space_1" name="def_en_access_space_1"> <strong>access space</strong></a><strong>:</strong> space intended to be occupied</p>
<p><a id="def_en_accessibility_2" name="def_en_accessibility_2"> <strong>accessibility</strong></a><strong>: </strong>extent to which products can be used (see <a href="#ref_2">[2]</a>)</p>
<p>NOTE 1: First note.</p><p>NOTE 2: Second note.</p>
<p><a id="def_en_caption_3" name="def_en_caption_3"> <strong>caption</strong></a><strong>:</strong> synchronized alternative</p>
<h3>3.3&nbsp; Abbreviations</h3>
<p>For the purposes of the present document, the following abbreviations apply:</p>
<p>ADA &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Americans with Disabilities Act</p>
<p>ATAG&nbsp;&nbsp;&nbsp; Authoring Tool Accessibility Guidelines (of W3C<sup>®</sup>)</p>
</body></html>`;

function split(language = 'en') {
	const output = formatDatPage(html, language);
	return { output, body: output, document: new JSDOM(output).window.document };
}

test('returns a standalone HTML page without frontmatter', () => {
	for (const language of ['en', 'fr']) {
		const { output, document } = split(language);
		assert.match(output, /^<!DOCTYPE html>\n<html lang="/u);
		assert.doesNotMatch(output, /^---/mu);
		assert.equal(document.documentElement.lang, language);
		assert.equal(document.title, 'Requirements');
		assert.equal(document.querySelector('meta[charset]').getAttribute('charset'), 'utf-8');
		assert.ok(document.querySelector('meta[name="viewport"]'));
		assert.equal(document.body.className, 'container');
		assert.equal(document.querySelector('head link[rel="stylesheet"]').getAttribute('href'), 'https://www.canada.ca/etc/designs/canada/wet-boew/css/theme.min.css');
	}
});

test('drops the title, generated line, includes and wrapper divs', () => {
	const { body, document } = split();
	assert.equal(document.querySelector('h1'), null);
	assert.equal(document.querySelector('div:not(.mrgn-lft-md)'), null);
	assert.doesNotMatch(body, /Generated 2026|\{%|\{\{/u);
});

test('removes the single-column clause table but keeps its content in order', () => {
	const { document } = split();
	assert.equal(document.querySelectorAll('table').length, 2);
	assert.equal(document.querySelector('table th').textContent, 'Abbreviation');
	assert.equal(document.querySelector('th[scope="col"]').textContent, 'Abbreviation');
	assert.ok(!document.body.textContent.includes('Clause'));
	const ids = [...document.querySelectorAll('[id^="clause_"]')].map((a) => a.id);
	assert.deepEqual(ids, ['clause_5', 'clause_5_1']);
	assert.equal(document.getElementById('clause_5_1').closest('h4').nextElementSibling.textContent, 'See access space.');
	assert.equal(document.getElementById('clause_5').closest('h3').textContent, '5 Generic requirements');
	assert.equal(document.querySelector('a[id^="clause_"], a[name^="clause_"]'), null);
});

test('strips table attributes and adds the toolkit table classes', () => {
	const { document } = split();
	const [firstTable, table51] = document.querySelectorAll('table');
	assert.deepEqual(firstTable.getAttributeNames(), ['class']);
	assert.equal(firstTable.className, 'table table-striped table-hover');
	assert.equal(firstTable.querySelectorAll(':scope > thead').length, 1);
	assert.deepEqual([...firstTable.querySelectorAll(':scope > thead th')].map((th) => th.textContent), ['Abbreviation', 'Criterion']);
	assert.ok([...firstTable.querySelectorAll(':scope > thead th')].every((th) => th.getAttribute('scope') === 'col'));
	assert.equal(table51.querySelectorAll(':scope > thead').length, 1);
	assert.deepEqual([...table51.querySelectorAll(':scope > thead th')].map((th) => th.textContent), ['Viewing distance', 'Minimum text height']);
	assert.ok([...table51.querySelectorAll(':scope > thead th')].every((th) => th.getAttribute('scope') === 'col'));
});

test('converts terms to a definition list with anchors and notes', () => {
	const { document } = split();
	const terms = [...document.querySelectorAll('dl')][0];
	assert.deepEqual([...terms.querySelectorAll('dt')].map((dt) => dt.textContent), ['access space', 'accessibility', 'caption']);
	const dt = terms.querySelector('dt');
	assert.equal(dt.id, 'def_en_access_space_1');
	assert.equal(dt.querySelector('a'), null);
	assert.equal(terms.querySelectorAll('dd')[0].textContent, 'space intended to be occupied');
	const notes = terms.querySelectorAll('dd')[1].querySelector('div.mrgn-lft-md');
	assert.deepEqual([...notes.children].map((p) => [p.tagName, p.textContent]), [['P', 'NOTE 1: First note.'], ['P', 'NOTE 2: Second note.']]);
	assert.equal(terms.querySelectorAll('dd')[1].querySelector('li'), null);
	assert.equal(terms.querySelectorAll('dd')[1].querySelector('a[href="#ref_2"]').textContent, '[2]');
	assert.equal(document.querySelectorAll('dd > p').length, 0);
});

test('converts abbreviations to a definition list', () => {
	const { document } = split();
	const abbreviations = [...document.querySelectorAll('dl')][1];
	assert.deepEqual([...abbreviations.querySelectorAll('dt')].map((dt) => dt.textContent), ['ADA', 'ATAG']);
	assert.equal(abbreviations.querySelector('dd').textContent, 'Americans with Disabilities Act');
	assert.equal(abbreviations.querySelectorAll('dd')[1].innerHTML, 'Authoring Tool Accessibility Guidelines (of W3C<sup>®</sup>)');
});

test('converts references to an unstyled list that keeps the anchors', () => {
	const { document } = split();
	const list = document.querySelector('ul.list-unstyled');
	assert.equal(list.querySelectorAll('li').length, 2);
	assert.equal(list.querySelector('li#ref_1 strong').textContent, '[1]');
	assert.equal(list.querySelectorAll('li')[1].textContent, '[2] ETSI ES 200: "Telephony".');
});

test('collapses runs of non-breaking spaces but keeps a single one', () => {
	const { document, output } = split();
	assert.ok([...document.querySelectorAll('h3')].some((h3) => h3.textContent === '2.1 Normative references'));
	assert.match(document.querySelector('p').textContent, /^Body text with extra spaces and a single\u00a0space\.$/u);
	assert.doesNotMatch(output, /(&nbsp;){2}/u);
});

test('adds a section list linking to top-level clauses and annexes', () => {
	const { document } = split();
	const heading = [...document.querySelectorAll('h2')].find((h2) => h2.textContent === 'Found in this section');
	const links = [...heading.nextElementSibling.querySelectorAll('a')];
	assert.deepEqual(links.map((a) => [a.textContent, a.getAttribute('href')]), [
		['5 Generic requirements', '#clause_5'],
		['Annex - References (from EN 301 549)', '#annex-references-from-en-301-549'],
		['Annex – Definition of terms', '#annex-definition-of-terms']
	]);
	assert.equal(heading.nextElementSibling.nextElementSibling.tagName, 'H3');
	assert.equal(heading.nextElementSibling.nextElementSibling.id, 'clause_5');
	for (const link of links) assert.ok(document.getElementById(link.getAttribute('href').slice(1)));
});

test('emits Markdown-safe HTML: no blank lines or indented lines', () => {
	const { body } = split();
	assert.doesNotMatch(body, /\n\s*\n/u);
	assert.doesNotMatch(body, /^[ \t]/mu);
	assert.match(body, /^<table class="table table-striped table-hover">$/mu);
});

test('does not modify the source html', () => {
	const before = html;
	formatDatPage(before, 'en');
	assert.equal(before, html);
});

test('replaces leading runs of non-breaking spaces with WET left margin classes', () => {
	const input = '<html><body><table><tbody><tr><td><p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 400</p></td>' +
		'<td><p>&nbsp;&nbsp;&nbsp;&nbsp; 1 000</p></td><td><p>&nbsp;&nbsp; 10 000</p></td><td><p>&nbsp;5</p></td>' +
		'<td><p class="x">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</p></td></tr></tbody></table></body></html>';
	const body = formatDatPage(input, 'en');
	const cells = [...new JSDOM(body).window.document.querySelectorAll('p')];
	assert.deepEqual(cells.map((p) => [p.className, p.textContent.trim()]), [
		['mrgn-lft-xl', '400'], ['mrgn-lft-lg', '1 000'], ['mrgn-lft-md', '10 000'], ['', '5'], ['x', '']
	]);
	assert.equal(cells[0].textContent, '400');
});

test('wraps each group of consecutive NOTE paragraphs in a margin div', () => {
	const input = '<html><body><p>Intro.</p><p>NOTE 1: One.</p><p>NOTE 2: Two.</p><p>Body.</p><p>NOTE: Solo.</p></body></html>';
	const document = new JSDOM(formatDatPage(input, 'en')).window.document;
	const groups = [...document.querySelectorAll('div')];
	assert.equal(groups.length, 2);
	for (const group of groups) assert.equal(group.className, 'mrgn-lft-md mrgn-rght-md mrgn-tp-sm mrgn-bttm-sm');
	assert.deepEqual(groups.map((group) => [...group.children].map((p) => p.textContent)), [['NOTE 1: One.', 'NOTE 2: Two.'], ['NOTE: Solo.']]);
	assert.equal(document.querySelector('p').textContent, 'Intro.');
});

test('replaces lists nested only for indenting with a margin class', () => {
	const input = '<html><body><ol>\n<ol>\n<ol type="a"><li>First</li><li>Second <ul><li>Real child</li></ul></li></ol>\n</ol>\n</ol><ul><li>Plain</li></ul></body></html>';
	const document = new JSDOM(formatDatPage(input, 'en')).window.document;
	const lists = [...document.querySelectorAll('ol, ul')];
	assert.equal(document.querySelectorAll('ol').length, 1);
	const indented = document.querySelector('ol');
	assert.equal(indented.className, 'mrgn-lft-lg');
	assert.equal(indented.getAttribute('type'), 'a');
	assert.equal(indented.parentElement.tagName, 'BODY');
	assert.equal(indented.querySelector('li ul li').textContent, 'Real child');
	assert.equal(lists.find((list) => list.textContent.trim() === 'Plain').className, '');
});

test('replaces line breaks after commas with a space but keeps other breaks', () => {
	const input = '<html><body><p>Where ICT is <a href="#x">closed</a>,<br>the ICT shall, <br> comply.<br>Next line.</p></body></html>';
	const paragraph = new JSDOM(formatDatPage(input, 'en')).window.document.querySelector('p');
	assert.equal(paragraph.querySelectorAll('br').length, 1);
	assert.equal(paragraph.textContent, 'Where ICT is closed, the ICT shall, comply.Next line.');
});

test('keeps the list type set on a wrapper list when flattening', () => {
	const input = '<html><body><ol type="a"><ol><li>One</li><li>Two</li></ol></ol></body></html>';
	const list = new JSDOM(formatDatPage(input, 'en')).window.document.querySelector('ol');
	assert.equal(list.getAttribute('type'), 'a');
	assert.equal(list.className, 'mrgn-lft-lg');
	assert.equal(list.querySelectorAll('li').length, 2);
});

test('moves remaining destination IDs to their containers without removing links', () => {
	for (const language of ['en', 'fr']) {
		const input = '<p><strong><a id="clause_4_2_1" name="clause_4_2_1">4.2.1 Usage without vision</a></strong></p>' +
			'<p><strong><a id="table_8_1" name="table_8_1">Table 8.1</a></strong></p>' +
			'<p><a href="#clause_4_2_1">4.2.1</a> and <a href="#table_8_1">Table 8.1</a></p>';
		const document = new JSDOM(formatDatPage(input, language)).window.document;
		assert.equal(document.querySelector('a[id], a[name]'), null);
		assert.equal(document.getElementById('clause_4_2_1').tagName, 'P');
		assert.equal(document.getElementById('table_8_1').tagName, 'P');
		assert.equal(document.querySelectorAll('a[href]').length, 2);
		for (const link of document.querySelectorAll('a[href]')) {
			assert.ok(document.getElementById(link.getAttribute('href').slice(1)));
		}
	}
});
