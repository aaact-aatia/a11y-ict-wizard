// Middleware to check if the user is logged in
module.exports = (req, res, next) => {
	if (req.session.loggedIn) {
		return next();
	}
	res.redirect('/login');
};
