const fs = require('fs');
const logger = require('tracer').colorConsole({
    level: 'trace' ,
    format: '{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})',
    dateformat: 'HH:MM:ss',
    transport: function(data) {
        console.log(data.output)
        var stream = fs
            .createWriteStream('../dns.log', {
                flags: 'a',
                encoding: 'utf8',
                mode: 0o666
            })
            .write(data.rawoutput + '\n')
    }
}); // 引入tracer模块，用于打印日志

module.exports = logger;