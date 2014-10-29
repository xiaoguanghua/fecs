/**
 * @file css checker
 * @author chris<wfsr@foxmail.com>
 */

var through = require('through2');
var csshint = require('csshint');
var RcLoader = require('rcloader');

/**
 * 根据文件路径中扩展名判断当前能否处理
 *
 * @param {string} path 文件路径
 * @return {boolean} 是否可处理
 */
function canHandle(path) {
    return /\.css$/.test(path);
}


/**
 * 负责代码风格检查的转换流
 *
 * @param {Object} options 配置项
 * @return {Transform}
 */
module.exports = function (options) {
    var util = require('../util');

    var defaultConfig = require('./config').csshint;
    var rcloader = new RcLoader('.csslintrc', defaultConfig, {loader: util.parseJSON});
    var checked = {};

    return through(
        {
            objectMode: true
        },

        function (file, enc, cb) {

            if (file.isStream()) {
                cb(new Error('Streaming not supported'));
                return;
            }

            if (checked[file.path] || !canHandle(file.path) || file.isNull()) {
                cb(null, file);
                return;
            }

            file.errors = [];
            checked[file.path] = true;

            var config = options.lookup
                ? rcloader.for(file.path)
                : defaultConfig;

            try {
                var errors = csshint.checkString(file.contents.toString(), config);

                errors.forEach(function (error) {
                    file.errors.push({
                        line: error.line,
                        column: 'col' in error ? error.col : error.column,
                        message: error.message,
                        type: 'css',
                        checker: 'csshint',
                        origin: error,
                        rule: error.ruleName
                    });
                    // console.log(error);
                });
            }
            catch (error) {
                file.errors.push({
                    line: error.line,
                    column: error.column,
                    message: error.message.replace('null:', file.relative + ':'),
                    type: 'css',
                    checker: 'csshint',
                    origin: error,
                    code: "999"
                });
            }

            cb(null, file);

        },

        function (cb) {
            rcloader = null;
            checked = null;
            cb();
        }
    );
};