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

// Simple authorization for edit routes
const BASICAUTHUSERNAME = process.env.BASICAUTHUSERNAME || "admin";
const BASICAUTHPASSWORD = process.env.BASICAUTHPASSWORD || "admin";

const basicAuth = auth.basic(
	{ realm: "Editing requires login" },
	(user, pass, cb) =>
		cb(user === BASICAUTHUSERNAME && pass === BASICAUTHPASSWORD)
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
