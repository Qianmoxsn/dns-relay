const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const logger = require('./logger');

let config;

const argv = yargs
    .option('ipv4', {
        alias: 's',
        description: '上游DNS服务器的IPv4地址',
        type: 'string'
    })
    .option('ipv6', {
        alias: 'ss',
        description: '上游DNS服务器的IPv6地址',
        type: 'string'
    })
    .option('port', {
        alias: 'p',
        description: '上游DNS服务器的端口号',
        type: 'number'
    })
    .help()
    .alias('help', 'h')
    .argv;

const defaultConfigPath = path.resolve(__dirname, '../config.json');

if (fs.existsSync(defaultConfigPath)) {
    config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
} else {
    logger.warn('Config file not found, using param settings');
}

config.upstreamDNS.ipv4 = argv.ipv4 || config.upstreamDNS.ipv4;
config.upstreamDNS.ipv6 = argv.ipv6 || config.upstreamDNS.ipv6;
config.upstreamDNS.port = argv.port || config.upstreamDNS.port;

module.exports = config;
