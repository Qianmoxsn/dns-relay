const fs = require('fs');
const path = require('path');

let config;

const filePath = path.resolve("../config.json");

if (fs.existsSync(filePath)) {
    config = JSON.parse(fs.readFileSync(filePath));
}

module.exports = config;