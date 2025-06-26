const express = require('express');
const router = express.Router();

const USERNAME = process.env.BASICAUTHUSERNAME || 'admin';
const PASSWORD = process.env.BASICAUTHPASSWORD || 'admin';

// GET login pages
router.get('/login', (req, res) => {
	res.render('login', { error: null });
});

router.get('/fr/login', (req, res) => {
	res.render('login_fr', { error: null });
});

// POST login logic (English)
router.post('/login', (req, res) => {
	const { username, password } = req.body;
	if (username === USERNAME && password === PASSWORD) {
		req.session.loggedIn = true;
		req.session.username = username;
		res.redirect('/edit');
	} else {
		res.render('login', { error: 'Invalid username or password.' });
	}
});

// POST login logic (French)
router.post('/fr/login', (req, res) => {
	const { username, password } = req.body;
	if (username === USERNAME && password === PASSWORD) {
		req.session.loggedIn = true;
		req.session.username = username;
		res.redirect('/edit'); // adjust later if there's a /fr/edit
	} else {
		res.render('login_fr', { error: 'Nom d’utilisateur ou mot de passe invalide.' });
	}
});


// Logout
router.get('/logout', (req, res) => {
	req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
