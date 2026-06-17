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

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateName(name) {
    return typeof name === 'string' && name.length >= 2 && name.length <= 50;
}

function validatePassword(password) {
    return typeof password === 'string' &&
           password.length >= 8 &&
           password.length <= 128;
}

function validatePostContent(text) {
    return typeof text === 'string' &&
           text.length >= 1 &&
           text.length <= 2000;
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateOTP,
    hashOTP,
    verifyOTP,
    sanitizeInput,
    validateEmail,
    validateName,
    validatePassword,
    validatePostContent,
};
