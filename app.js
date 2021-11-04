const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const sassMiddleware = require('node-sass-middleware');
const mongoose = require('mongoose');
const auth = require('http-auth');

const app = express();
app.locals.moment = require('moment');

// Database connection
const mongoDB = process.env.DB_URI || 'mongodb://testcio.mongo.cosmos.azure.com:10255/a11y-req';
mongoose.connect(mongoDB, { 
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Express server configuration (see also /bin/www)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: false, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Simple authorization for edit routes
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || "testcio";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "DlJzhvIBogboQeDYlUevzBz5wvlcQylltbl6nmZdiPdMRkfBDe55P5xRNuEPVPh5rcfXSGoKlG2YhSweDfeqLQ==";

const basicAuth = auth.basic(
  { realm: "Editing requires login" },
  (user, pass, cb) => cb(user === BASIC_AUTH_USERNAME && pass === BASIC_AUTH_PASSWORD)
);

// THE IMPORTANT PART
// Associate routes
app.use('/', require('./routes/generatorRoutes'));
app.use('/edit', auth.connect(basicAuth), require('./routes/editRoutes'));

// Error handling
app.use((req, res, next) => next(createError(404)));
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;