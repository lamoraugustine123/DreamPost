const {
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
} = require('../utils');

// ── hashPassword / verifyPassword ──────────────────────────────────────

describe('hashPassword', () => {
    test('returns an object with salt and hash strings', () => {
        const result = hashPassword('mySecret123');
        expect(result).toHaveProperty('salt');
        expect(result).toHaveProperty('hash');
        expect(typeof result.salt).toBe('string');
        expect(typeof result.hash).toBe('string');
    });

    test('produces a 32-byte hex salt (64 chars)', () => {
        const { salt } = hashPassword('pw');
        expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    test('produces different salts for the same password', () => {
        const a = hashPassword('same');
        const b = hashPassword('same');
        expect(a.salt).not.toBe(b.salt);
    });
});

describe('verifyPassword', () => {
    test('returns true for correct password', () => {
        const { salt, hash } = hashPassword('correct');
        expect(verifyPassword('correct', salt, hash)).toBe(true);
    });

    test('returns false for wrong password', () => {
        const { salt, hash } = hashPassword('correct');
        expect(verifyPassword('wrong', salt, hash)).toBe(false);
    });
});

// ── generateOTP ────────────────────────────────────────────────────────

describe('generateOTP', () => {
    test('returns a 6-digit numeric string', () => {
        const otp = generateOTP();
        expect(otp).toMatch(/^\d{6}$/);
    });

    test('value is between 100000 and 999999', () => {
        for (let i = 0; i < 50; i++) {
            const n = Number(generateOTP());
            expect(n).toBeGreaterThanOrEqual(100000);
            expect(n).toBeLessThanOrEqual(999999);
        }
    });
});

// ── hashOTP / verifyOTP ────────────────────────────────────────────────

describe('hashOTP + verifyOTP', () => {
    test('verifies a matching OTP', () => {
        const otp = '123456';
        const { salt, hash } = hashOTP(otp);
        expect(verifyOTP(otp, salt, hash)).toBe(true);
    });

    test('rejects a non-matching OTP', () => {
        const { salt, hash } = hashOTP('111111');
        expect(verifyOTP('222222', salt, hash)).toBe(false);
    });
});

// ── sanitizeInput ──────────────────────────────────────────────────────

describe('sanitizeInput', () => {
    test('trims whitespace', () => {
        expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    test('strips angle brackets', () => {
        expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    test('removes javascript: protocol (case-insensitive)', () => {
        expect(sanitizeInput('JavaScript:void(0)')).toBe('void(0)');
    });

    test('removes inline event handlers', () => {
        expect(sanitizeInput('onerror=alert(1)')).toBe('alert(1)');
        expect(sanitizeInput('onclick=foo()')).toBe('foo()');
    });

    test('returns non-string values unchanged', () => {
        expect(sanitizeInput(42)).toBe(42);
        expect(sanitizeInput(null)).toBe(null);
        expect(sanitizeInput(undefined)).toBe(undefined);
    });
});

// ── validateEmail ──────────────────────────────────────────────────────

describe('validateEmail', () => {
    test.each([
        'user@example.com',
        'a@b.co',
        'name+tag@domain.org',
    ])('accepts valid email: %s', (email) => {
        expect(validateEmail(email)).toBe(true);
    });

    test.each([
        '',
        'noatsign',
        '@missing-local.com',
        'missing@.com',
        'spaces in@email.com',
    ])('rejects invalid email: %s', (email) => {
        expect(validateEmail(email)).toBe(false);
    });
});

// ── validateName ───────────────────────────────────────────────────────

describe('validateName', () => {
    test('accepts names between 2 and 50 chars', () => {
        expect(validateName('Jo')).toBe(true);
        expect(validateName('A'.repeat(50))).toBe(true);
    });

    test('rejects names that are too short', () => {
        expect(validateName('A')).toBe(false);
        expect(validateName('')).toBe(false);
    });

    test('rejects names that are too long', () => {
        expect(validateName('A'.repeat(51))).toBe(false);
    });

    test('rejects non-string values', () => {
        expect(validateName(123)).toBe(false);
        expect(validateName(null)).toBe(false);
    });
});

// ── validatePassword ───────────────────────────────────────────────────

describe('validatePassword', () => {
    test('accepts passwords between 8 and 128 chars', () => {
        expect(validatePassword('12345678')).toBe(true);
        expect(validatePassword('x'.repeat(128))).toBe(true);
    });

    test('rejects passwords shorter than 8 chars', () => {
        expect(validatePassword('1234567')).toBe(false);
        expect(validatePassword('')).toBe(false);
    });

    test('rejects passwords longer than 128 chars', () => {
        expect(validatePassword('x'.repeat(129))).toBe(false);
    });

    test('rejects non-string values', () => {
        expect(validatePassword(12345678)).toBe(false);
    });
});

// ── validatePostContent ────────────────────────────────────────────────

describe('validatePostContent', () => {
    test('accepts content between 1 and 2000 chars', () => {
        expect(validatePostContent('a')).toBe(true);
        expect(validatePostContent('x'.repeat(2000))).toBe(true);
    });

    test('rejects empty string', () => {
        expect(validatePostContent('')).toBe(false);
    });

    test('rejects content over 2000 chars', () => {
        expect(validatePostContent('x'.repeat(2001))).toBe(false);
    });

    test('rejects non-string values', () => {
        expect(validatePostContent(42)).toBe(false);
        expect(validatePostContent(null)).toBe(false);
    });
});
