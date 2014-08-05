var express      = require('express');
var path         = require('path');
var favicon      = require('static-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var session      = require('cookie-session')
var bodyParser   = require('body-parser');
var routes       = require('./routes/index');
var nunjucks     = require('nunjucks');
var crypto       = require('crypto');
var app          = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
nunjucks.configure('views', {
    autoescape: true,
    express   : app
});

// app setup
app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    keys: ['Esto es una key que no se deberia saber_'],
    secureProxy: false // if you do SSL outside of node
}))
app.use(function (request, response, next) {
    if ( ! request.session.id) {
        var sha = crypto.createHash('md5');
        sha.update(Math.random().toString());
        request.session.id = sha.digest('hex');
    }
    next();
})

// All to routes
app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(request, response, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, request, response, next) {
        response.status(err.status || 500);
        response.render('error.html', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, request, response, next) {
    response.status(err.status || 500);
    response.render('error.html', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
