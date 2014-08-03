var layout  = require('../libs/layout');

module.exports = function (router) {

    router.get('/', function(request, response) {
        layout(response, 'home/index.html', {});
    });

    return router;
}
