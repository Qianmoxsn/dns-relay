const fs = require('fs');
const path = require('path');

let rules;

const filePath = path.resolve("dns_rules.json");

if (fs.existsSync(filePath)) {
    rules = JSON.parse(fs.readFileSync(filePath));
}


// Tests

// 统计
console.log("Total rules:", Object.keys(rules).length); // 打印解析后的JSON数据的长度

// 打印解析后的JSON数据
console.log(rules);

// 打印指定域名的解析规则
console.log("666 ip:", rules["www.666.com"]);

