function matchLocalRules(parsedmsg, rules) {
    let type = parsedmsg.questions[0].type;
    if (type === 1 || type === 28) {
        let domain = parsedmsg.questions[0].name;
        if (domain in rules) {
            return rules[domain];
        }
    }
}

module.exports = {
    matchLocalRules
}