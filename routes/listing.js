var layout  = require('../libs/layout');
var restApi = require('../libs/restApi');

module.exports = function (router) {

    router.param('catId', /^\d+$/);
    router.param('slug', /^\w+$/);

    // GET Listing
    router.get('/:slug-cat-:catId', function(request, response) {
        //console.log(request.session);
        var url = 'http://abl-server.olx.com.ar:9696/rest/seo/listing/'
            + 'capitalfederal-gba.olx.com.ar/allresults?app_id=site'
            + '&offset=0&limit=30&sort=date_to_show+desc&langCode=es';
        restApi.get(url, function (model) {
            layout(response, 'listing/index.html', model);
        });
    });

    return router;
}
