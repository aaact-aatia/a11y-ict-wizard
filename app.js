const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const authConnect = require("http-auth-connect");

const mongoose = require("mongoose");
const auth = require("http-auth");

const app = express();
app.locals.moment = require("moment");

app.use(express.static(path.join(__dirname, "public")));

try {
	const mongoDB = process.env.DB_URI || "mongodb://127.0.0.1:27017/a11y-req";
	//const mongoDB = 'mongodb://127.0.0.1:27017/a11y-req';
	mongoose.connect(mongoDB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});
	const db = mongoose.connection;
	db.on("error", console.error.bind(console, "MongoDB connection error:"));
	console.log(`MongoDB Connected: ${mongoose.connection.host}`);
} catch (error) {
	console.error(`Error: ${error.message}`);
}

// Express server configuration (see also /bin/www)
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

// Simple authorization for edit routes
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || "admin";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "admin";

const basicAuth = auth.basic(
	{ realm: "Editing requires login" },
	(user, pass, cb) =>
		cb(user === BASIC_AUTH_USERNAME && pass === BASIC_AUTH_PASSWORD)
);

// THE IMPORTANT PART
// Associate routes
app.use("/", require("./routes/generatorRoutes"));
app.use("/edit", authConnect(basicAuth), require("./routes/editRoutes"));

// Error handling
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};
	res.status(err.status || 500);
	res.render("error");
});

module.exports = app;
