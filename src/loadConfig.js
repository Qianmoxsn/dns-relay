const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

let config;

const argv = yargs
    .option('ipv4', {
        description: '上游DNS服务器的IPv4地址',
        type: 'string'
    })
    .option('ipv6', {
        description: '上游DNS服务器的IPv6地址',
        type: 'string'
    })
    .option('port', {
        description: '上游DNS服务器的端口号',
        type: 'number'
    })
    .help()
    .alias('help', 'h')
    .argv;

const defaultConfigPath = path.resolve(__dirname, 'config.json');

if (fs.existsSync(defaultConfigPath)) {
    config = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
} else {
    config = {
        upstreamDNS: {
            ipv4: '8.8.8.8',
            ipv6: '2400:3200::1',
            port: 53
        }
    };
}

config.upstreamDNS.ipv4 = argv.ipv4 || config.upstreamDNS.ipv4;
config.upstreamDNS.ipv6 = argv.ipv6 || config.upstreamDNS.ipv6;
config.upstreamDNS.port = argv.port || config.upstreamDNS.port;

module.exports = config;
