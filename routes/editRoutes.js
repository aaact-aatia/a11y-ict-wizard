const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // or configure as needed

// Require controller modules.
const clause_controller = require('../controllers/clauseController');
const info_controller = require('../controllers/infoController');
const question_controller = require('../controllers/questionController');

// Authentication credentials
const ADMIN_USERNAME = process.env.BASICAUTHUSERNAME || "admin";
const ADMIN_PASSWORD = process.env.BASICAUTHPASSWORD || "admin";

// Authentication middleware
const requireAuth = (req, res, next) => {
	if (req.session && req.session.user) {
		return next();
	}
	// Store the original URL to redirect after login
	req.session.returnTo = req.originalUrl;
	res.redirect('/edit/login');
};

// Login routes (public - no auth required)
router.get('/login', (req, res) => {
	// If already logged in, redirect to edit home
	if (req.session && req.session.user) {
		return res.redirect('/edit');
	}
	const enVersion = process.env.EN_VERSION;
	res.render('login', { 
		title: `Admin login - ICT accessibility requirements wizard - ${enVersion || 'EN 301 549'}`, 
		error: null 
	});
});

// French login page
router.get('/fr/login', (req, res) => {
	// If already logged in, redirect to edit home
	if (req.session && req.session.user) {
		return res.redirect('/edit');
	}
	const enVersion = process.env.EN_VERSION;
	res.render('login_fr', { 
		title: `Admin login - ICT accessibility requirements wizard - ${enVersion || 'EN 301 549'}`, 
		error: null 
	});
});

router.post('/login', (req, res) => {
	const { username, password } = req.body;
	
	if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
		// Set session
		req.session.user = { username };
		
		// Redirect to the original URL or default to /edit
		const returnTo = req.session.returnTo || '/edit';
		delete req.session.returnTo;
		res.redirect(returnTo);
	} else {
		const enVersion = process.env.EN_VERSION;
		res.render('login', { 
			title: `Admin login - ICT accessibility requirements wizard - ${enVersion || 'EN 301 549'}`, 
			error: 'Invalid username or password' 
		});
	}
});

// French login POST
router.post('/fr/login', (req, res) => {
	const { username, password } = req.body;
	
	if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
		// Set session
		req.session.user = { username };
		
		// Redirect to the original URL or default to /edit
		const returnTo = req.session.returnTo || '/edit';
		delete req.session.returnTo;
		res.redirect(returnTo);
	} else {
		const enVersion = process.env.EN_VERSION;
		res.render('login_fr', { 
			title: `Admin login - ICT accessibility requirements wizard - ${enVersion || 'EN 301 549'}`, 
			error: 'Nom d\'utilisateur ou mot de passe invalide' 
		});
	}
});

// Logout route
router.get('/logout', (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.error('Error destroying session:', err);
		}
		res.redirect('/');
	});
});

// Apply authentication to all other routes
router.use(requireAuth);

// GET edit (admin) page
router.get('/', info_controller.edit_list);

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
// GET for clause loader
router.get('/clause_loader', clause_controller.clause_loader_get);

// POST request for creating a Clause
router.post('/clause/create', clause_controller.clause_create_post);

// GET request to edit Clause
router.get('/clause/:id', clause_controller.clause_update_get);

// POST request to edit Clause
router.post('/clause/:id', clause_controller.clause_update_post);
// post for clause loader
router.post('/clause_loader', upload.fields([
  { name: 'englishfile', maxCount: 1 },
  { name: 'frenchfile', maxCount: 1 }
]), clause_controller.clause_loader_post);


// GET request to delete Clause
router.get('/clause/:id/delete', clause_controller.clause_delete_get);

// POST request to delete Clause
router.post('/clause/:id/delete', clause_controller.clause_delete_post);


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