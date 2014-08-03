module.exports = function(response, template, model) {
    response.render(template, {model: model}, function(err, html) {
        if (err) {
            html = err;
        }
        response.render('layout.html', {
            title: 'Express',
            body: html
        });
    });
};
