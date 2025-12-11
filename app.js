require('dotenv').config(); 
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");

const mongoose = require("mongoose");

const app = express();
app.locals.moment = require("moment");

app.use(express.static(path.join(__dirname, "public")));
// Serve TinyMCE from node_modules (self-hosted, GPL license)
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));

const mongoDB = process.env.DBURI || "mongodb://127.0.0.1:27017/a11y-req";
console.log(`Connecting to MongoDB at: ${mongoDB}`);

mongoose
	.connect(mongoDB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		const db = mongoose.connection;
		console.log(`✅ Connected to MongoDB database: ${db.name}`);
	})
	.catch((error) => {
		console.error("❌ MongoDB connection error:", error.message);
	});

// Express server configuration (see also /bin/www)
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));
app.use(cookieParser());

// Session configuration
app.use(session({
	secret: process.env.SESSION_SECRET || 'a11y-ict-wizard-secret-change-in-production',
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
		httpOnly: true,
		maxAge: 1000 * 60 * 60 * 24 // 24 hours
	}
}));

// Make user session available to all templates
app.use((req, res, next) => {
	res.locals.user = req.session.user;
	next();
});

// Authentication middleware for protected routes
const requireAuth = (req, res, next) => {
	if (req.session && req.session.user) {
		return next();
	}
	// Store the original URL to redirect after login
	req.session.returnTo = req.originalUrl;
	res.redirect('/edit/login');
};

// THE IMPORTANT PART
// Associate routes
app.use("/", require("./routes/generatorRoutes"));
app.use("/edit", require("./routes/editRoutes")); // Auth middleware now in routes

// Error handling
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};
	res.status(err.status || 500);
	res.render("error");
});

// Export requireAuth middleware for use in routes
module.exports = app;
module.exports.requireAuth = requireAuth;
