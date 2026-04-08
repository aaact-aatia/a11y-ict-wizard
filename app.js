require('dotenv').config(); 
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");

const mongoose = require("mongoose");

// Suppress Mongoose deprecation warnings
mongoose.set('strictQuery', false);

const app = express();
app.locals.moment = require("moment");

app.use(express.static(path.join(__dirname, "public")));
// Serve TinyMCE from node_modules (self-hosted, GPL license)
app.use('/tinymce', express.static(path.join(__dirname, 'node_modules', 'tinymce')));

const mongoDB = process.env.DBURI || "mongodb://127.0.0.1:27017/a11y-req";
console.log(`Connecting to MongoDB at: ${mongoDB}`);

/**
 * Connect to MongoDB with retry logic for Docker container startup
 * @param {number} retries - Number of connection attempts remaining
 * @param {number} delay - Delay in milliseconds between attempts
 */
async function connectWithRetry(retries = 10, delay = 3000) {
	try {
		await mongoose.connect(mongoDB, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		
		const db = mongoose.connection;
		console.log(`✅ Connected to MongoDB database: ${db.name}`);
		
		// Initialize database from JSON files if empty
		try {
			const initializeDatabase = require('./scripts/init-db');
			await initializeDatabase();
		} catch (initError) {
			console.error('⚠️  Database initialization warning:', initError.message);
			// Don't fail the app if initialization fails - database might already be populated
		}
		
		return true;
	} catch (error) {
		if (retries > 0) {
			console.log(`⏳ MongoDB connection failed. Retrying in ${delay/1000}s... (${retries} attempts remaining)`);
			await new Promise(resolve => setTimeout(resolve, delay));
			return connectWithRetry(retries - 1, delay);
		} else {
			console.error("❌ MongoDB connection error after all retries:", error.message);
			throw error;
		}
	}
}

// Start connection with retry logic
connectWithRetry().catch(error => {
	console.error("❌ Failed to connect to MongoDB. Application may not function correctly.");
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
