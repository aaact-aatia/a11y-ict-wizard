// NOTE: "clause" == "fps" (functional performance statement)

const async = require('async');
const mongoose = require('mongoose');
const path = require('path');
const htmlDocx = require('html-docx-js');

const Clause = require('../models/clauseSchema');
const Question = require('../models/questionSchema');
const Info = require('../models/infoSchema');
const toClauseTree = require('./clauseTree');

const getTestableClauses = (clauses) =>
	clauses.filter((clause) =>
		!clause.informative && clause.description.length > 0);

// Select functional accessibility requirements or question
exports.wizard_get = (req, res, next) => {
	async.parallel({
		clauses: (callback) => Clause.find().exec(callback),
		questions: (callback) => Question.find().exec(callback)
	}, (err, results) => {
		if (err) { return next(err); }
		res.render('wizard', {
			title: 'ICT accessibility requirements wizard',
			clause_tree: toClauseTree(results.clauses),
			question_list: results.questions
		});
	});
};

// Select functional accessibility requirements or question
exports.wizard_fr_get = (req, res, next) => {
	async.parallel({
		clauses: (callback) => Clause.find().exec(callback),
		questions: (callback) => Question.find().exec(callback)
	}, (err, results) => {
		if (err) { return next(err); }
		res.render('wizard_fr', {
			title: 'Assistant des exigences d\'accessibilité des TIC',
			clause_tree: toClauseTree(results.clauses),
			question_list: results.questions
		});
	});
};

exports.download = (req, res, next) => {
	console.log('Download request received');
	let strings = { template: req.params.template };
	const format = req.body.format;
	if (req.params.template.slice(-2) === 'fr') {
		strings.filename = 'Annexe X - Exigences en matière de TIC accessibles.' + format;
		strings.title = 'Exigences en matière de TIC accessibles';
	} else {
		strings.filename = 'Annex X - ICT Accessibility Requirements.' + format;
		strings.title = 'ICT Accessibility Requirements';
	}
	if (req.params.template.includes("evaluation")) {
		if (req.params.template.slice(-2) === 'fr') {
			strings.filename = 'Annexe Y - Exigences testables selectés dans l Annexe X.' + format;
		} else {
			strings.filename = 'Annex Y - Testable requirements selected in Annex X.' + format;
		}
	}
	// Edge case: < 2 clauses selected
	if (!(req.body.clauses instanceof Array)) {
		if (typeof req.body.clauses === 'undefined') {
			req.body.clauses = [];
		} else {
			req.body.clauses = new Array(req.body.clauses);
		}
	}

	let clause_ids = [];
	for (let id of req.body.clauses) {
		clause_ids.push(mongoose.Types.ObjectId(id));
	}

	async.parallel({
		fps: (callback) => Clause.find({ '_id': { $in: clause_ids } }).exec(callback),
		intro: (callback) => {
			// Find sections with names NOT starting with "Annex"
			Info.find({ name: /^(?!Annex).*/ })
				.sort([['order', 'ascending']])
				.exec(callback);
		},
		annex: (callback) => {
			// Find sections with names starting with "Annex"
			Info.find({ name: /^Annex/ })
				.sort([['order', 'ascending']])
				.exec(callback);
		},
	}, (err, results) => {
		if (err) {
			console.error('Error during MongoDB query:', err);
			return next(err);
		}
		if (!results.fps || results.fps.length === 0) { // No clauses selected
			console.log('No clauses selected, redirecting...');
			return res.redirect('/view/create');
		}
		results.fps = results.fps.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

		// Remove Tables and Figures annex if not applicable
		let figureClauses = ['5.1.4', '8.3.4.1', '8.3.4.2', '8.3.4.3.2', '8.3.4.3.3', '8.3.2.5', '8.3.2.6',
			'8.3.2.1', '8.3.2.2', '8.3.2.3.2', '8.3.2.3.3', '8.3.3.1', '8.3.3.2',
			'8.3.3.3.1', '8.3.3.3.2'];
		results.annex = results.annex.filter(function (el) {
			return !el.name.includes('figures') ||
				results.fps.some(e => figureClauses.includes(e.number));
		});

		// Set the correct headers for the attachment
		res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(strings.filename)}`);

		res.render(strings.template, {
			title: strings.title,
			item_list: results.fps,
			test_list: getTestableClauses(results.fps),
			intro: results.intro,
			annex: results.annex
		}, (err, output) => {
			if (err) {
				console.error('Error during HTML rendering:', err);
				return next(err);
			}

			if (format == 'html') {
				console.log("sending html file");
				res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
				res.send(output);
			}
			else {
				const options = {
					orientation: req.body.orientation,
					margins: {
						top: 1304,
						bottom: 1304,
						left: 1134,
						right: 1134
					}
				};
				const docxBlob = htmlDocx.asBlob(output, options);
				docxBlob.arrayBuffer().then((arrayBuffer) => {
					const docxBuffer = Buffer.from(new Uint8Array(arrayBuffer));
					res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(strings.filename)}`);
					res.send(docxBuffer);
				});
			}
		});
	});
};
