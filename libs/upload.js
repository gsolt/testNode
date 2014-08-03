module.exports = function () {
    var path = require('path'),
        fs = require('fs'),
        _existsSync = fs.existsSync || path.existsSync,
        formidable = require('formidable'),
        imageMagick = require('imagemagick'),
        nameCountRegexp = /(?:(?: \(([\d]+)\))?(\.[^.]+))?$/,
        s3,
        options = {
            tmpDir:  __dirname + '/../public/uploaded/tmp',
            uploadDir: __dirname + '/../public/uploaded/files',
            uploadUrl:  '/uploaded/files/',
            maxPostSize: 11000000000, // 11 GB
            minFileSize: 1,
            maxFileSize: 10000000000, // 10 GB
            acceptFileTypes: /.+/i,
            copyImgAsThumb: true,
            useSSL: false,
            // Files not matched by this regular expression force a download dialog,
            // to prevent executing any scripts in the context of the service domain:
            inlineFileTypes: /\.(gif|jpe?g|png)/i,
            imageTypes: /\.(gif|jpe?g|png)/i,
            imageVersions: {
                'thumbnail': {
                    width: 80,
                    height: 80
                }
            },
            accessControl: {
                allowOrigin: '*',
                allowMethods: 'OPTIONS, HEAD, GET, POST, PUT, DELETE',
                allowHeaders: 'Content-Type, Content-Range, Content-Disposition'
            }
        };

    checkExists(options.tmpDir);
    checkExists(options.uploadDir);
    if (options.copyImgAsThumb) checkExists(options.uploadDir + '/thumbnail');

    // check if upload folders exists
    function checkExists(dir) {
        fs.exists(dir, function(exists){
            if( ! exists) {
                 throw new Error(dir + ' does not exists. Please create the folder');
            }
        });
    }

    var nameCountFunc = function (s, index, ext) {
        return ' (' + ((parseInt(index, 10) || 0) + 1) + ')' + (ext || '');
    };
    var FileInfo = function (file) {
        this.name = file.name;
        this.size = file.size;
        this.type = file.type;
        this.deleteType = 'DELETE';
    };

    FileInfo.prototype.safeName = function () {
        // Prevent directory traversal and creating hidden system files:
        this.name = path.basename(this.name).replace(/^\.+/, '');
        // Prevent overwriting existing files:
        while (_existsSync(options.uploadDir + '/' + this.name)) {
            this.name = this.name.replace(nameCountRegexp, nameCountFunc);
        }
    };

    FileInfo.prototype.initUrls = function (req, sss) {
        if ( ! this.error) {
            var that = this;
            if( ! sss) {
                var baseUrl = (options.useSSL ? 'https:' : 'http:') +
                    '//' + req.headers.host + options.uploadUrl;
                that.url =  baseUrl + encodeURIComponent(that.name);
                that.deleteUrl = baseUrl +encodeURIComponent(that.name);
                Object.keys(options.imageVersions).forEach(function (version) {
                    if (_existsSync(
                            options.uploadDir+ '/' + version + '/' + that.name
                    )) {
                        that[version + 'Url'] = baseUrl + version + '/' +
                            encodeURIComponent(that.name);
                    }
                });
            } else {
                that.url = sss.url;
                that.deleteUrl = options.uploadUrl + sss.url.split('/')[sss.url.split('/').length - 1].split('?')[0];
                if (options.imageTypes.test(sss.url)) {
                    Object.keys(options.imageVersions).forEach(function (version) {
                        that[version+'Url'] = sss.url;
                    });
                }
            }
        }
    };

    FileInfo.prototype.validate = function () {
        if (options.minFileSize && options.minFileSize > this.size) {
            this.error = 'File is too small';
        } else if (options.maxFileSize && options.maxFileSize < this.size) {
            this.error = 'File is too big';
        } else if (!options.acceptFileTypes.test(this.name)) {
            this.error = 'Filetype not allowed';
        }
        return !this.error;
    };

    var setNoCacheHeaders = function (res) {
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Content-Disposition', 'inline; filename="files.json"');
    }

    var fileUploader = {};

    fileUploader.get = function (req, res, callback) {
        setNoCacheHeaders(res);
        var files = [];
        fs.readdir(options.uploadDir, function (err, list) {
            list.forEach(function (name) {
                var stats = fs.statSync(options.uploadDir + '/' + name),
                    fileInfo;
                if (stats.isFile() && name[0] !== '.') {
                    fileInfo = new FileInfo({
                        name: name,
                        size: stats.size
                    });
                    fileInfo.initUrls(req);
                    files.push(fileInfo);
                }
            });
            callback({
                files: files
            });
        });
    };

    fileUploader.post = function (req, res, callback) {
        setNoCacheHeaders(res);
        var form = new formidable.IncomingForm(),
            tmpFiles = [],
            files = [],
            map = {},
            counter = 1,
            redirect,
            finish = function (sss) {
                counter -= 1;
                if ( ! counter) {
                    files.forEach(function (fileInfo) {
                        fileInfo.initUrls(req, sss);
                    });
                    callback({
                        files: files
                    }, redirect);
                }
            };

        form.uploadDir = options.tmpDir;

        form.on('fileBegin', function (name, file) {
            tmpFiles.push(file.path);
            var fileInfo = new FileInfo(file, req, true);
            fileInfo.safeName();
            map[path.basename(file.path)] = fileInfo;
            files.push(fileInfo);
        }).on('field', function (name, value) {
            if (name === 'redirect') {
                redirect = value;
            }
        }).on('file', function (name, file) {
            var fileInfo = map[path.basename(file.path)];
            fileInfo.size = file.size;
            if ( ! fileInfo.validate()) {
                fs.unlink(file.path);
                return;
            }
            // part ways here
            fs.renameSync(file.path, options.uploadDir + '/' + fileInfo.name);

            if (options.copyImgAsThumb && options.imageTypes.test(fileInfo.name)) {
                Object.keys(options.imageVersions).forEach(function (version) {
                    var opts = options.imageVersions[version];
                    counter += 1;
                    imageMagick.resize({
                        width: opts.width,
                        height: opts.height,
                        srcPath: options.uploadDir + '/' + fileInfo.name,
                        dstPath: options.uploadDir + '/' + version + '/' + fileInfo.name
                    }, function(err, stdout, stderr) {
                        if (err) throw err;
                        finish();
                    });
                });
            }
        }).on('aborted', function () {
            tmpFiles.forEach(function (file) {
                fs.unlink(file);
            });
        }).on('error', function (e) {
            console.log(e);
        }).on('progress', function (bytesReceived) {
            if (bytesReceived > options.maxPostSize) {
                req.connection.destroy();
            }
        }).on('end', function(){
            finish();
        }).parse(req);
    };

    fileUploader.delete = function (req, res, callback) {
        var fileName;
        if (req.url.slice(0, options.uploadUrl.length) === options.uploadUrl) {
            fileName = path.basename(decodeURIComponent(req.url));
            if (fileName[0] !== '.') {
                fs.unlink(options.uploadDir + '/' + fileName, function (ex) {
                    Object.keys(options.imageVersions).forEach(function (version) {
                        fs.unlink(options.uploadDir + '/' + version + '/' + fileName, function (err) {
                            //if (err) throw err;
                        });
                    });
                    callback({
                        success: !ex
                    });
                });
                return;
            }
        }
        callback({
            success: false
        });
    };

    return fileUploader;
};
