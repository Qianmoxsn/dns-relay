const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const logger = require('./logger');

let config;

const argv = yargs
    .option('ipv4', {
        alias: 's',
        description: 'IPv4 address of the upstream DNS server',
        type: 'string'
    })
    .option('ipv6', {
        description: 'IPv6 address of the upstream DNS server',
        type: 'string'
    })
    .option('port', {
        alias: 'p',
        description: 'The port number of the upstream DNS server',
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
