# DNS-Relay
> Node.js 实现的简单 DNS 中继服务器
> 

## 功能
- 支持 IPv4 和 IPv6 访问
- 支持自定义解析规则 (配置文件)
- 无规则解析时，自动转发请求到上游DNS服务器
- 转发请求后根据响应信息自动缓存
- 支持自定义 上游DNS 服务器 (参数 && 配置文件)
- 支持自定义 监听端口 (参数 && 配置文件)
- 日志记录 (控制台 && 文件)

## 使用
### 安装
```shell
gh repo clone Qianmoxsn/dns-relay
cd dns-relay
npm install
```
### 使用
```shell
cd dns-relay/src
node dnsServer.js --ipv4 1.1.1.1 --ipv6 2606:4700:4700::1111 --port 53
```
参数说明：  

| 参数              | 说明                  |     值     |
|-----------------|---------------------|:---------:|
| `    --version` | Show version number | [boolean] |
| `-s, --ipv4`    | IPv4 address of the upstream DNS server     | [string]  |
| `    --ipv6`    | IPv6 address of the upstream DNS server     | [string]  |
| `-p, --port `   | The port number of the upstream DNS server        | [number]  |
| `-h, --help`    | Show help           | [boolean] |
