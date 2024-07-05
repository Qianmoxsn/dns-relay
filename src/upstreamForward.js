const logger = require('./logger');
const dgram = require('node:dgram');
const config = require('./loadConfig');

const upstreamServer = config.upstreamDNS.ipv4;
const upstreamPort = config.upstreamDNS.port;
const upstreamServerV6 = config.upstreamDNS.ipv6;

logger.trace(`Find Upstream v4DNS Server: ${upstreamServer}:${upstreamPort} in Config`);
logger.trace(`Find Upstream v6DNS Server: [${upstreamServerV6}]:${upstreamPort} in Config`);

async function v4forward(msg) {
    return new Promise((resolve, reject) => {
        if (!msg || !(msg instanceof Buffer)) {
            reject(new Error('Invalid message buffer'));
            return;
        }

        const client = dgram.createSocket('udp4');
        client.send(msg, 0, msg.length, upstreamPort, upstreamServer, (err) => {
            logger.info(`[Forward] Send DNS request to ${upstreamServer}:${upstreamPort}`);
            if (err) {
                logger.error(`client error:\n${err.stack}`);
                client.close();
                reject(err);
            }
        });

        client.on('message', (response) => {
            logger.info(`[Forward] Received response from upstream server`);
            client.close();
            resolve(response);
        });

        client.on('error', (err) => {
            logger.error(`client error:\n${err.stack}`);
            client.close();
            reject(err);
        });
    });
}

async function v6forward(msg) {
    return new Promise((resolve, reject) => {
        if (!msg || !(msg instanceof Buffer)) {
            reject(new Error('Invalid message buffer'));
            return;
        }

        const client = dgram.createSocket('udp6');
        client.send(msg, 0, msg.length, upstreamPort, upstreamServerV6, (err) => {
            logger.info(`[Forward] Send DNS request to ${upstreamServerV6}:${upstreamPort}`);
            if (err) {
                logger.error(`client error:\n${err.stack}`);
                client.close();
                reject(err);
            }
        });

        client.on('message', (response) => {
            logger.info(`[Forward] Received response from upstream server`);
            client.close();
            resolve(response);
        });

        client.on('error', (err) => {
            logger.error(`client error:\n${err.stack}`);
            client.close();
            reject(err);
        });
    });
}

module.exports = {
    v4forward,
    v6forward
}
