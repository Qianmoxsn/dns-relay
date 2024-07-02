const dnsRules = require('./loadRules');
const logger = require('./logger');
const forward = require('./upstreamForward');
const dgram = require('node:dgram');

logger.info(`Total rules: ${Object.keys(dnsRules).length}`);
logger.trace(dnsRules);

const v4server = dgram.createSocket('udp4');
const v6server = dgram.createSocket('udp6');

// 处理服务器的错误事件
v4server.on('error', (err) => {
    logger.error(`v4 server error:\n${err.stack}`);
    v4server.close();
});
v6server.on('error', (err) => {
    logger.error(`v6 server error:\n${err.stack}`);
    v6server.close();
});

//处理服务器监听事件
v4server.on('listening', () => {
    const address = v4server.address();
    logger.info(`v4 server listening on ${address.address}:${address.port}`);

});
v6server.on('listening', () => {
    const address = v6server.address();
    logger.info(`v6 server listening on ${address.address}:${address.port}`);
});

//处理接收到的DNS请求消息(message事件)
v4server.on('message', async (msg, rinfo) => {
    logger.trace(`v4 server got MSG from ${rinfo.address}:${rinfo.port}`);
    const res = await forward.v4forward(msg);
    if (res instanceof Buffer) {
        v4server.send(res, 0, res.length, rinfo.port, rinfo.address, (err) => {
            if (err) {
                logger.error(`v4 server send error:\n${err.stack}`);
            }
        });
    } else {
        throw new Error('Expected response to be a Buffer');
    }

});
v6server.on('message', async (msg, rinfo) => {
    logger.trace(`v6 server got MSG from ${rinfo.address}:${rinfo.port}`);
});

// 开启服务器监听
v4server.bind(53, '0.0.0.0');
v6server.bind(53, '::');