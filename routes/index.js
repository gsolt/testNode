var express = require('express');
var fs      = require('fs');
var path    = require('path');
var router  = express.Router();

// Set Params with RegExp
router.param(function(name, fn) {
    if (fn instanceof RegExp) {
        return function(request, response, next, val) {
            var captures;
            if (captures = fn.exec(String(val))) {
                request.params[name] = captures;
                next();
            } else {
                next('route');
            }
        }
    }
});

// Add all the routers without any order
fs.readdirSync(__dirname).forEach(function(filename) {
    var name = path.basename(filename, '.js');
    if (name === 'index') {
        return;
    }
    require('./' + name)(router);
});

module.exports = router;
