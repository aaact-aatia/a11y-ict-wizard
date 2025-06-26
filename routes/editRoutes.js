const express = require('express');
const router = express.Router();
const checkLogin = require('../middleware/checkLogin');

// Middleware to check if user is logged in
router.use(checkLogin);

// Require controller modules.
const clause_controller = require('../controllers/clauseController');
const info_controller = require('../controllers/infoController');
const question_controller = require('../controllers/questionController');

// GET edit (admin) page
router.get('/', info_controller.edit_list);

// GET edit page for admin
router.get('/', (req, res) => {
	res.render('edit'); // or whatever your edit view is
});

//GET JSON file on download
router.get('/questionsdownload', question_controller.question_json_get);
router.get('/clausesdownload', clause_controller.clause_json_get);
router.get('/infosdownload', info_controller.info_json_get);

//POST Restore JSON file
router.post('/questionsrestore', question_controller.question_json_restore_post);
router.post('/clausesrestore', clause_controller.clause_json_restore_post);
router.post('/infosrestore', info_controller.info_json_restore_post);

/* Clauses */
// GET request for list of all Clauses
router.get('/clauses', clause_controller.clause_list);

// GET request for creating a Clause
router.get('/clause/create', clause_controller.clause_create_get);

// POST request for creating a Clause
router.post('/clause/create', clause_controller.clause_create_post);

// GET request to edit Clause
router.get('/clause/:id', clause_controller.clause_update_get);

// POST request to edit Clause
router.post('/clause/:id', clause_controller.clause_update_post);

// GET request to delete Clause
router.get('/clause/:id/delete', clause_controller.clause_delete_get);

// POST request to delete Clause
router.post('/clause/:id/delete', clause_controller.clause_delete_post);

// Populate database with Clauses from HTML tables
// (Uncomment if necessary to re-populate the database)
router.get('/clauses/populate', clause_controller.clause_populate);


/* Informative Sections */

// GET request for list of all Infos
router.get('/infos', info_controller.info_list);

// GET request for creating a Info
router.get('/info/create', info_controller.info_create_get);

// POST request for creating a Info
router.post('/info/create', info_controller.info_create_post);

// GET request to edit Info
router.get('/info/:id', info_controller.info_update_get);

// POST request to edit Info
router.post('/info/:id', info_controller.info_update_post);

// GET request to delete Info
router.get('/info/:id/delete', info_controller.info_delete_get);

// POST request to delete Info
router.post('/info/:id/delete', info_controller.info_delete_post);


/* Commodity Questions */

// GET request for list of all Questions
router.get('/questions', question_controller.question_list);

// GET request for creating a Question
router.get('/question/create', question_controller.question_create_get);

// POST request for creating a Question
router.post('/question/create', question_controller.question_create_post);

// GET request to edit Question
router.get('/question/:id', question_controller.question_update_get);

// POST request to edit Question
router.post('/question/:id', question_controller.question_update_post);

// GET request to delete Question
router.get('/question/:id/delete', question_controller.question_delete_get);

// POST request to delete Question
router.post('/question/:id/delete', question_controller.question_delete_post);


module.exports = router;
