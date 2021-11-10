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
// const mongoDB = process.env.DB_URI || 'mongodb://testcio.mongo.cosmos.azure.com:10255/a11y-req';
// Database connection
try 
{
    const mongoDB = 'mongodb://ictaccessibility-db:zSZahFS5wwHKhq0XsY3NuAXxnqWaPu7vu9JItRqpLQiOidYyI5WbbVLU7IzyT8Rz0gNqmeJQaDPuiEY6oEHyKQ==@ictaccessibility-db.mongo.cosmos.azure.com:10255/a11y-req?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@ictaccessibility-db@';
    //const mongoDB = 'mongodb://127.0.0.1:27017/a11y-req';
    mongoose.connect(mongoDB, { 
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'MongoDB connection error:'));
    console.log(`MongoDB Connected: ${mongoose.connection.host}`)
} 
catch (error) 
{
    console.error(`Error: ${error.message}`)   
}

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
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || "ictaccessibility-db";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "zSZahFS5wwHKhq0XsY3NuAXxnqWaPu7vu9JItRqpLQiOidYyI5WbbVLU7IzyT8Rz0gNqmeJQaDPuiEY6oEHyKQ==";

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