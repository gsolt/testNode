var layout   = require('../libs/layout');
var uploader = require('../libs/upload')();
var restApi  = require('../libs/restApi');

module.exports = function (router) {

    router.get('/newForm', function(request, response) {
        layout(response, 'post/index.html', {});
    });

    router.get('/editForm/:id', function(request, response) {
        var url = 'http://abl-server.olx.com.ar:9696/rest/seo/posting/form/item/' + request.params.id + '?langCode=es&try=1';
        restApi.get(url, function (originalModel) {
            var model = {
                'title' : originalModel.item.title, //fix abl
                'description': originalModel.item.description, //fix abl
                'files': []
            }
            if (originalModel.item.images) {
                console.log(originalModel.item);
                originalModel.item.images.forEach(function (file) {
                    model.files.push({
                        'name': file.thumbUrl,
                        'thumbnailUrl': file.thumbUrl,
                        'size': 1
                    });



                });
            }
            layout(response, 'post/index.html', model);
        });
    });

    /*
    router.get('/upload', function(req, res) {
        uploader.get(req, res, function (obj) {
            res.send(JSON.stringify(obj));
        });
    });
    */

    router.post('/uploadFile', function(req, res) {
        uploader.post(req, res, function (obj) {
            res.send(JSON.stringify(obj));
        });
    });

    router.delete('/uploaded/files/:name', function(req, res) {
        uploader.delete(req, res, function (obj) {
            res.send(JSON.stringify(obj));
        });
    });

    router.post('/saveForm', function(request, response) {
        var model = {
            'title': request.body.title,
            'description': request.body.description,
            'files': []
        };
        request.body.files.forEach(function (file) {
            model.files.push({'name': file});
        });
        layout(response, 'post/success.html', model);
    });

    return router;
}
