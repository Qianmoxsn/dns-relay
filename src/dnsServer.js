const dnsRules = require('./loadRules');
const logger = require('./logger');
const forward = require('./upstreamForward');
const resolver = require('./dnsResolve');
const matcher = require('./ruleMatch');
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

// 处理服务器监听事件
v4server.on('listening', () => {
    const address = v4server.address();
    logger.info(`v4 server listening on ${address.address}:${address.port}`);

});
v6server.on('listening', () => {
    const address = v6server.address();
    logger.info(`v6 server listening on ${address.address}:${address.port}`);
});

// 处理接收到的DNS请求消息(message事件)
v4server.on('message', async (msg, rinfo) => {
    logger.trace(`v4 server got MSG from ${rinfo.address}:${rinfo.port}`);
    // 解析DNS请求消息
    let rlt = resolver.parseDnsMsg(msg);
    logger.trace(`Parse Result: ${JSON.stringify(rlt, null, 2)}`);
    // 进行本地规则匹配，如果匹配到规则，则返回规则中定义的IP地址
    let ip
    if (rlt.questions.length > 0) {
        ip = matcher.matchLocalRules(rlt, dnsRules);
    } else {
        logger.error(`No questions found in DNS request`);
    }

    // 生成DNS响应包
    if (ip) {
        logger.trace(`Matched IP: ${ip}`);
        const answers = [{
            name: rlt.questions[0].name,
            type: rlt.questions[0].type,
            class: rlt.questions[0].class,
            ttl: 300,
            data: ip.split('.').map(octet => parseInt(octet, 10).toString(16).padStart(2, '0')).join('')
        }];
        let replyCode;
        if (ip === "0.0.0.0") {
            replyCode = 3;
        } else {
            replyCode = 0;
        }
        const responseBuffer = resolver.generateDnsMsg(rlt, replyCode, answers);

        console.log(responseBuffer.toString('hex'));

        v4server.send(responseBuffer, 0, responseBuffer.length, rinfo.port, rinfo.address, (err) => {
            if (err) {
                logger.error(`v4 server send error:\n${err.stack}`);
            } else {
                logger.info(`Sent local response to ${rinfo.address}:${rinfo.port}`);
            }
        });
        return;
    }


    // 如果没有匹配到规则，则转发DNS请求到上游DNS服务器
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
    // 解析DNS请求消息
    let rlt = resolver.parseDnsMsg(msg);
    logger.trace(`Parse Result: ${JSON.stringify(rlt, null, 2)}`);

    const res = await forward.v6forward(msg);
    if (res instanceof Buffer) {
        v6server.send(res, 0, res.length, rinfo.port, rinfo.address, (err) => {
            if (err) {
                logger.error(`v6 server send error:\n${err.stack}`);
            }
        });
    } else {
        throw new Error('Expected response to be a Buffer');
    }
});

// 开启服务器监听
v4server.bind(53, '0.0.0.0');
v6server.bind(53, '::');