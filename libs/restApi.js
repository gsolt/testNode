var request = require('request');

exports.get = function (url, callback) {
    request.get(url, function(err, response, body) {
        if ( ! err && response.statusCode == 200) {
            var model = JSON.parse(body).response;
            callback(model);
        }
    });
};
