// NOTE: "clause" == "fps" (functional performance statement)

const async = require('async');
const mongoose = require('mongoose');
const HtmlDocx = require('html-docx-js');

const Clause = require('../models/clauseSchema');
const Preset = require('../models/presetSchema');
const Info = require('../models/infoSchema');
const toClauseTree = require('./clauseTree');

const getTestableClauses = (clauses) =>
	clauses.filter((clause) =>
		!clause.informative && clause.description.length > 0
	);

// Select functional accessibility requirements or preset
exports.wizard_get = (req, res, next) => {
	async.parallel({
		clauses: (callback) => Clause.find().exec(callback),
		presets: (callback) => Preset.find().exec(callback)
	}, (err, results) => {
		if (err) return next(err);
		res.render('wizard', {
			title: 'ICT accessibility requirements wizard',
			clause_tree: toClauseTree(results.clauses),
			preset_list: results.presets
		});
	});
};

// Select functional accessibility requirements or preset
exports.wizard_fr_get = (req, res, next) => {
	async.parallel({
		clauses: (callback) => Clause.find().exec(callback),
		presets: (callback) => Preset.find().exec(callback)
	}, (err, results) => {
		if (err) return next(err);
		res.render('wizard_fr', {
			title: "Assistant des exigences d'accessibilité des TIC",
			clause_tree: toClauseTree(results.clauses),
			preset_list: results.presets
		});
	});
};

// Word Document Download
exports.download = (req, res, next) => {
	let strings = { template: req.params.template };
	if (req.params.template.slice(-2) === 'fr') {
		strings.filename = 'Annexe X - Exigences en matière de TIC accessibles.docx';
		strings.title = 'Exigences en matière de TIC accessibles';
	} else {
		strings.filename = 'Annex X - ICT Accessibility Requirements.docx';
		strings.title = 'ICT Accessibility Requirements';
	}
	if (req.params.template.includes("evaluation")) {
		if (req.params.template.slice(-2) === 'fr') {
			strings.filename = 'Annexe Y - Évaluation de l\u2019accessibilité des TIC.docx';
			strings.title = 'Évaluation de l\u2019accessibilité des TIC.docx';
		} else {
			strings.filename = 'Annex Y - ICT Accessibility Evaluation.docx';
			strings.title = 'ICT Accessibility Evaluation.docx';
		}
	}

	// Normalize clause input to array
	if (!(req.body.clauses instanceof Array)) {
		if (typeof req.body.clauses === 'undefined') {
			req.body.clauses = [];
		} else {
			req.body.clauses = [req.body.clauses];
		}
	}

	const clause_ids = req.body.clauses.map((id) => mongoose.Types.ObjectId(id));

	async.parallel({
		fps: (callback) => Clause.find({ _id: { $in: clause_ids } }).exec(callback),
		intro: (callback) => Info.find({ name: /^(?!Annex).*/ }).sort([['order', 'ascending']]).exec(callback),
		annex: (callback) => Info.find({ name: /^Annex/ }).sort([['order', 'ascending']]).exec(callback),
	}, (err, results) => {
		if (err) return next(err);
		if (!results.fps) return res.redirect('/view/create');

		results.fps = results.fps.sort((a, b) =>
			a.number.localeCompare(b.number, undefined, { numeric: true })
		);

		// Filter annex sections if figures aren't referenced
		const figureClauses = [
			'5.1.4', '8.3.4.1', '8.3.4.2', '8.3.4.3.2', '8.3.4.3.3', '8.3.2.5', '8.3.2.6',
			'8.3.2.1', '8.3.2.2', '8.3.2.3.2', '8.3.2.3.3', '8.3.3.1', '8.3.3.2',
			'8.3.3.3.1', '8.3.3.3.2'
		];
		results.annex = results.annex.filter((el) =>
			!el.name.includes('figures') ||
			results.fps.some(e => figureClauses.includes(e.number))
		);

		// Render the Pug template and convert to Word
		res.render(strings.template, {
			title: strings.title,
			item_list: results.fps,
			test_list: getTestableClauses(results.fps),
			intro: results.intro,
			annex: results.annex
		}, (err, output) => {
			if (err) return next(err);
			if (!output || typeof output !== 'string') {
				console.error("Invalid output HTML for DOCX generation.");
				return res.status(500).send("Failed to generate Word document.");
			}

			HtmlDocx.asBlob(output, {
				orientation: req.body.orientation,
				margins: {
					top: 1304,
					bottom: 1304,
					left: 1134,
					right: 1134
				}
			}).arrayBuffer().then((arrayBuffer) => {
				const buffer = Buffer.from(arrayBuffer);

				res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(strings.filename)}`);
				res.send(buffer);
			}).catch((error) => {
				console.error("Failed to generate Word doc:", error);
				res.status(500).send("Error generating Word document");
			});
		});
	});
};
