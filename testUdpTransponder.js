const dgram = require('node:dgram'); // 引入Node.js的dgram模块，用于创建UDP套接字
const logger = require('tracer').colorConsole({ level: 'trace' }); // 引入tracer模块，用于打印日志

const server = dgram.createSocket('udp4'); // 创建一个UDP4类型的服务器套接字
const upstreamServer = '8.8.8.8'; // 上游DNS服务器地址（如Google的公共DNS服务器）
const upstreamPort = 53; // 上游DNS服务器端口（标准DNS端口）

async function dns_resolve() {
    logger.trace(`Running DNS Resolving`); // 打印日志
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

    await dns_resolve(); // 调用DNS解析函数

    // 创建一个客户端套接字，用于将请求转发到上游DNS服务器
    const client = dgram.createSocket('udp4');

    // 将接收到的DNS请求转发到上游DNS服务器
    client.send(msg, 0, msg.length, upstreamPort, upstreamServer, (err) => {
        logger.trace(`${server.address().address} send DNS request to ${upstreamServer}:${upstreamPort}`); // 打印转发请求的日志
        if (err) {
            console.error(`client error:\n${err.stack}`); // 打印错误信息
            client.close(); // 关闭客户端套接字
        }
    });

    // 监听上游DNS服务器的响应
    client.on('message', (response) => {
        logger.trace(`${server.address().address} received response from upstream server`); // 打印接收到上游服务器响应的日志

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