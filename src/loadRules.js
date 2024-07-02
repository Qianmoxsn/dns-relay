const fs = require('fs');
const path = require('path');

let rules;

const filePath = path.resolve("../dns_rules.json");

if (fs.existsSync(filePath)) {
    rules = JSON.parse(fs.readFileSync(filePath));
}

module.exports = rules;