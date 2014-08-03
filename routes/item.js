var layout  = require('../libs/layout');
var restApi = require('../libs/restApi');

module.exports = function (router) {

    router.param('id', /^\d+$/);

    // GET Listing
    router.get('/:title-iid-:id', function(request, response) {
        //console.log(request.session);
        var url = 'http://abl-server.olx.com.ar:9696/rest/seo/domain/1/item/'
            + request.params.id + '?langCode=es';
        restApi.get(url, function (model) {
            layout(response, 'item/index.html', model);
        });
    });

    return router;
}
