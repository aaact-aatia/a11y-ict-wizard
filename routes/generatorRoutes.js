const express = require('express');
const router = express.Router();

const generator_controller = require('../controllers/generatorController');
const Clause = require("../models/clauseSchema"); // Correct model import
const buildClauseTree = require("../controllers/clauseTree.js"); // Your refactored tree function

// Wizard routes
router.get('/', generator_controller.wizard_get);
router.get('/fr/', generator_controller.wizard_fr_get);
router.post('/:template', generator_controller.download);

// ✅ Temporary debug route for clause tree
router.get("/debug/clause-tree", async (req, res) => {
	try {
		const clauses = await Clause.find(); // No version filtering needed
		const result = buildClauseTree(clauses);
		res.json(result); // Includes tree and warnings
	} catch (err) {
		console.error("Clause tree debug error:", err);
		res.status(500).json({ error: "Failed to build clause tree." });
	}
});

module.exports = router;
