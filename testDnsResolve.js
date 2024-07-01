const dgram = require('node:dgram');
const buffer = require("node:buffer"); // 引入Node.js的dgram模块，用于创建UDP套接字
const logger = require('tracer').colorConsole({level: 'trace'}); // 引入tracer模块，用于打印日志

const server = dgram.createSocket('udp4'); // 创建一个UDP4类型的服务器套接字
const upstreamServer = '8.8.8.8'; // 上游DNS服务器地址（如Google的公共DNS服务器）
const upstreamPort = 53; // 上游DNS服务器端口（标准DNS端口）

async function dns_resolve(dnsdata, rinfo) {
    logger.info(`Running DNS Resolving`); // 打印日志
    const transactionId = dnsdata.readUInt16BE(0); // 读取DNS请求消息的事务ID
    const flags = dnsdata.readUInt16BE(2); // 读取DNS请求消息的标志
    const qr = (flags >> 15) & 0b1; // 读取DNS请求消息的查询/响应标志
    const opcode = (flags >> 11) & 0b1111; // 读取DNS请求消息的操作码
    if (qr === 1) {
        const repcode = (flags >> 0) & 0b1111; // 读取DNS请求消息的响应码
    }
    const questions = dnsdata.readUInt16BE(4); // 读取DNS请求消息的问题数
    const answers = dnsdata.readUInt16BE(6); // 读取DNS请求消息的回答数

    const authority = dnsdata.readUInt16BE(8); // 读取DNS请求消息的授权数
    const additional = dnsdata.readUInt16BE(10); // 读取DNS请求消息的附加数

    // 根据questions的值，解析查询部分的内容
    let querys = [];
    let offset = 12;
    for (let i = 0; i < questions; i++) {
        let query = {
            name: null,
            type: null,
            class: null,
        };
        // fill query
        let tmpname = '';
        while (true) {
            let byte = dnsdata.readUInt8(offset); // 读取一个字节
            offset += 1;  // 移动到下一个字节
            if (byte === 0) { // 如果字节为0，表示名称结束
                break;
            } else {
                let label = dnsdata.toString('utf8', offset, offset + byte); // 读取标签
                tmpname += label + '.'; // 将标签添加到名称中，并加上点
                offset += byte; // 移动偏移量到下一个标签的起始位置
            }
        }
        // 去掉最后一个点
        if (tmpname.endsWith('.')) {
            tmpname = tmpname.slice(0, -1);
        }
        query.name = tmpname;

        query.type = dnsdata.slice(offset, offset + 2).toString('hex');
        offset += 2;
        query.class = dnsdata.slice(offset, offset + 2).toString('hex');
        offset += 2;
        // append query to querys
        querys.push(query)
    }

    let responses = [];
    if (qr === 1) {
        // 根据answers的值，解析回答部分的内容
        for (let i = 0; i < answers; i++) {
            let response = {
                name: null,
                type: null,
                class: null,
                ttl: null,
                datalength: null,
                data: null,
            };

            response.name = dnsdata.slice(offset, offset + 2).toString('hex');
            offset += 2;
            response.type = dnsdata.slice(offset, offset + 2).toString('hex');
            offset += 2;
            response.class = dnsdata.slice(offset, offset + 2).toString('hex');
            offset += 2;
            response.ttl = dnsdata.readUInt32BE(offset);
            offset += 4;
            response.datalength = dnsdata.readUInt16BE(offset);
            offset += 2;
            response.data = dnsdata.slice(offset, offset + response.datalength).toString('hex');
            offset += response.datalength;
            // append answer to response
            responses.push(response)
        }
    }

    logger.trace(`Transaction ID: 0x${transactionId.toString(16)}`); // 打印事务ID
    // logger.trace(`Flags: ${flags.toString(2).padStart(16, '0')}`); // 打印标志
    logger.trace(`Flags: 0x${flags.toString(16)}, OpCode: ${opcode}`); // 打印标志
    logger.trace(`Questions: ${questions}`); // 打印问题数
    logger.trace(`Answers: ${answers}`); // 打印回答数
    logger.trace(`Authority: ${authority}`); // 打印授权数
    logger.trace(`Additional: ${additional}`); // 打印附加数
    if (qr === 0){
        logger.trace(`Querys: ${JSON.stringify(querys, null, 2)}`); // 打印查询部分
    }else {
        logger.trace(`: ${JSON.stringify(responses, null, 2)}`); // 打印查询部分
    }

}

// 处理服务器的错误事件
server.on('error', (err) => {
    logger.error(`Server Error`); // 打印错误信息
    console.error(`server error:\n${err.stack}`); // 打印错误信息
    server.close(); // 关闭服务器套接字
});

// 处理接收到的DNS请求消息
server.on('message', async (msg, rinfo) => {

    logger.info(`Server recv DNS request from ${rinfo.address}:${rinfo.port}`); // 打印客户端地址和端口
    logger.info(`Family: ${rinfo.family} Size: ${rinfo.size}`);

    await dns_resolve(msg, rinfo); // 调用DNS解析函数

    // 创建一个客户端套接字，用于将请求转发到上游DNS服务器
    const client = dgram.createSocket('udp4');

    // 将接收到的DNS请求转发到上游DNS服务器
    client.send(msg, 0, msg.length, upstreamPort, upstreamServer, (err) => {
        logger.info(`${server.address().address} send DNS request to ${upstreamServer}:${upstreamPort}`); // 打印转发请求的日志
        if (err) {
            console.error(`client error:\n${err.stack}`); // 打印错误信息
            client.close(); // 关闭客户端套接字
        }
    });

    // 监听上游DNS服务器的响应
    client.on('message', async (response) => {
        logger.info(`${server.address().address} received response from upstream server`); // 打印接收到上游服务器响应的日志
        await dns_resolve(response, rinfo); // 调用DNS解析函数
        // 将上游服务器的响应转发给原始客户端
        server.send(response, 0, response.length, rinfo.port, rinfo.address, (err) => {
            if (err) {
                console.error(`server send error:\n${err.stack}`); // 打印错误信息
            }
            client.close(); // 关闭临时客户端套接字
        });
    });

    client.on('error', (err) => {
        console.error(`client error:\n${err.stack}`); // 打印错误信息
        client.close(); // 关闭客户端套接字
    });
});

// 处理服务器开始监听的事件
server.on('listening', () => {
    const address = server.address(); // 获取服务器地址信息
    logger.info(`server listening ${address.address}:${address.port}`); // 打印监听地址和端口
});

// 绑定服务器到53端口，开始监听DNS请求
server.bind(53);