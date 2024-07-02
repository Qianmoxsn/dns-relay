const logger = require('tracer').colorConsole({
    level: 'trace' ,
    format: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})',
    dateformat: 'HH:MM:ss'
}); // 引入tracer模块，用于打印日志

module.exports = logger;