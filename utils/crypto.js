const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt);
    hash.update(password);
    return { salt, hash: hash.digest('hex') };
}

function verifyPassword(password, salt, hash) {
    const newHash = crypto.createHmac('sha256', salt);
    newHash.update(password);
    return newHash.digest('hex') === hash;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHmac('sha256', salt);
    hash.update(otp);
    return { salt, hash: hash.digest('hex') };
}

function verifyOTP(otp, salt, hash) {
    const newHash = crypto.createHmac('sha256', salt);
    newHash.update(otp);
    return newHash.digest('hex') === hash;
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateOTP,
    hashOTP,
    verifyOTP,
};
