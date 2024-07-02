const logger = require('./logger');
const dgram = require('node:dgram');
const config = require('./loadConfig');

const upstreamServer = config.upstreamDNS.ip;
const upstreamPort = config.upstreamDNS.port;

logger.trace(`Find Upstream DNS Server: ${upstreamServer}:${upstreamPort} in Config`);

async function v4forward(msg) {
    return new Promise((resolve, reject) => {

        if (!msg || !(msg instanceof Buffer)) {
            reject(new Error('Invalid message buffer'));
            return;
        }

        // 创建一个客户端套接字，用于将请求转发到上游DNS服务器
        const client = dgram.createSocket('udp4');

        // 将接收到的DNS请求转发到上游DNS服务器
        client.send(msg, 0, msg.length, upstreamPort, upstreamServer, (err) => {
            logger.info(`[Forward] Send DNS request to ${upstreamServer}:${upstreamPort}`); // 打印转发请求的日志
            if (err) {
                logger.error(`client error:\n${err.stack}`); // 打印错误信息
                client.close(); // 关闭客户端套接字
                reject(err);
            }
        });

        // 监听上游DNS服务器的响应
        client.on('message', (response) => {
            logger.info(`[Forward] Received response from upstream server`); // 打印接收到上游服务器响应的日志
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
    // v6forward
}