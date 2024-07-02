const logger = require('./logger');

function parseDnsMsg(dnsdata) {
    logger.info(`Parsing DNS Message`);

    const transactionId = dnsdata.readUInt16BE(0);
    const flags = dnsdata.readUInt16BE(2);
    const qr = (flags >> 15) & 0b1;
    const opcode = (flags >> 11) & 0b1111;
    const questionsCount = dnsdata.readUInt16BE(4);
    const answersCount = dnsdata.readUInt16BE(6);
    const authorityCount = dnsdata.readUInt16BE(8);
    const additionalCount = dnsdata.readUInt16BE(10);

    let offset = 12;
    const questions = [];
    for (let i = 0; i < questionsCount; i++) {
        const question = parseQuestion(dnsdata, offset);
        questions.push(question.result);
        offset = question.offset;
    }

    const answers = [];
    if (qr === 1) {
        for (let i = 0; i < answersCount; i++) {
            const answer = parseAnswer(dnsdata, offset);
            answers.push(answer.result);
            offset = answer.offset;
        }
    }
    //
    // logger.trace(`Transaction ID: 0x${transactionId.toString(16)}`);
    // logger.trace(`Flags: 0x${flags.toString(16)}, OpCode: ${opcode}`);
    // logger.trace(`Questions: ${questionsCount}`);
    // logger.trace(`Answers: ${answersCount}`);
    // logger.trace(`Authority: ${authorityCount}`);
    // logger.trace(`Additional: ${additionalCount}`);
    // if (qr === 0) {
    //     logger.trace(`Questions: ${JSON.stringify(questions, null, 2)}`);
    // } else {
    //     logger.trace(`Answers: ${JSON.stringify(answers, null, 2)}`);
    // }

    return {
        transactionId,
        flags,
        qr,
        opcode,
        questions,
        answers,
        authorityCount,
        additionalCount,
    };
}

function parseQuestion(dnsdata, offset) {
    let name = '';
    while (true) {
        const length = dnsdata.readUInt8(offset);
        offset += 1;
        if (length === 0) break;
        const label = dnsdata.toString('utf8', offset, offset + length);
        name += label + '.';
        offset += length;
    }
    if (name.endsWith('.')) {
        name = name.slice(0, -1);
    }

    const type = dnsdata.readUInt16BE(offset);
    offset += 2;
    const clas = dnsdata.readUInt16BE(offset);
    offset += 2;

    return {
        result: {name, type, class: clas},
        offset,
    };
}

function parseAnswer(dnsdata, offset) {
    const name = dnsdata.readUInt16BE(offset).toString(16);
    offset += 2;
    const type = dnsdata.readUInt16BE(offset);
    offset += 2;
    const cls = dnsdata.readUInt16BE(offset);
    offset += 2;
    const ttl = dnsdata.readUInt32BE(offset);
    offset += 4;
    const dataLength = dnsdata.readUInt16BE(offset);
    offset += 2;
    const data = dnsdata.slice(offset, offset + dataLength).toString('hex');
    offset += dataLength;

    return {
        result: {name, type, class: cls, ttl, dataLength, data},
        offset,
    };
}

function generateDnsMsg(parsedMsg, replyCode, answers) {
    const header = Buffer.alloc(12);
    // 写入 Transaction ID
    header.writeUInt16BE(parsedMsg.transactionId, 0);
    // 设置标志位，将第 QR（响应标志）位置为1
    let resFlags = parsedMsg.flags;
    resFlags |= 0b1000000000000000; // 设置QR标志位 (响应)
    // 写入回复代码
    resFlags = (resFlags & 0b1111111111110000) | (replyCode & 0b0000000000001111);
    header.writeUInt16BE(resFlags, 2);
    header.writeUInt16BE(parsedMsg.questions.length, 4);
    header.writeUInt16BE(answers.length, 6);
    header.writeUInt16BE(parsedMsg.authorityCount, 8);
    header.writeUInt16BE(parsedMsg.additionalCount, 10);

    let questionsBuffer = Buffer.alloc(0);
    let offsetMap = {};
    let currentOffset = 12;

    for (const question of parsedMsg.questions) {
        const nameBuffer = encodeDnsName(question.name, offsetMap, currentOffset);
        const questionBuffer = Buffer.alloc(nameBuffer.length + 4);
        nameBuffer.copy(questionBuffer, 0);
        questionBuffer.writeUInt16BE(question.type, nameBuffer.length);
        questionBuffer.writeUInt16BE(question.class, nameBuffer.length + 2);
        questionsBuffer = Buffer.concat([questionsBuffer, questionBuffer]);
        currentOffset += nameBuffer.length + 4;
    }

    let answersBuffer = Buffer.alloc(0);
    for (const answer of answers) {
        const nameBuffer = encodeDnsName(answer.name, offsetMap, currentOffset);
        const dataBuffer = Buffer.from(answer.data, 'hex');
        const answerBuffer = Buffer.alloc(nameBuffer.length + 10 + dataBuffer.length);
        nameBuffer.copy(answerBuffer, 0);
        answerBuffer.writeUInt16BE(answer.type, nameBuffer.length);
        answerBuffer.writeUInt16BE(answer.class, nameBuffer.length + 2);
        answerBuffer.writeUInt32BE(answer.ttl, nameBuffer.length + 4);
        answerBuffer.writeUInt16BE(dataBuffer.length, nameBuffer.length + 8);
        dataBuffer.copy(answerBuffer, nameBuffer.length + 10);
        answersBuffer = Buffer.concat([answersBuffer, answerBuffer]);
        currentOffset += nameBuffer.length + 10 + dataBuffer.length;
    }

    return Buffer.concat([header, questionsBuffer, answersBuffer]);
}

function encodeDnsName(name, offsetMap, startOffset) {
    const labels = name.split('.');
    const buffers = [];
    let offset = startOffset;

    for (let i = 0; i < labels.length; i++) {
        const currentLabel = labels.slice(i).join('.');
        if (offsetMap.hasOwnProperty(currentLabel)) {
            const pointer = 0xc000 | offsetMap[currentLabel];
            const pointerBuffer = Buffer.alloc(2);
            pointerBuffer.writeUInt16BE(pointer, 0);
            buffers.push(pointerBuffer);
            return Buffer.concat(buffers);
        }
        offsetMap[currentLabel] = offset;
        const labelBuffer = Buffer.from(labels[i], 'ascii');
        buffers.push(Buffer.from([labels[i].length]));
        buffers.push(labelBuffer);
        offset += labels[i].length + 1;
    }
    buffers.push(Buffer.from([0])); // End of name
    return Buffer.concat(buffers);
}


module.exports = {
    parseDnsMsg,
    generateDnsMsg
};