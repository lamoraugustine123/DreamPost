/**
 * @jest-environment jsdom
 */

beforeEach(() => {
    // Build the minimal DOM the Calculator constructor expects
    document.body.innerHTML = `
        <input id="display" />
        <div id="buttons"></div>
        <ul id="history-list"></ul>
        <button class="mode-btn active" data-mode="standard">Standard</button>
        <button class="mode-btn" data-mode="scientific">Scientific</button>
        <button class="mode-btn" data-mode="programmer">Programmer</button>
    `;
});

// Require the module fresh for every test so the Calculator constructor
// re-binds to the new DOM elements created in beforeEach.
function createCalc() {
    // Isolate module cache so each call gets a fresh import
    jest.resetModules();
    const Calculator = require('../calculator');
    return new Calculator();
}

// ── Initialisation ─────────────────────────────────────────────────────

describe('Calculator initialisation', () => {
    test('starts in standard mode', () => {
        const calc = createCalc();
        expect(calc.currentMode).toBe('standard');
    });

    test('renders standard buttons on init', () => {
        createCalc();
        const buttons = document.querySelectorAll('#buttons button');
        expect(buttons.length).toBeGreaterThan(0);
        const labels = Array.from(buttons).map(b => b.textContent);
        expect(labels).toContain('7');
        expect(labels).toContain('=');
        expect(labels).toContain('C');
    });
});

// ── handleButton ───────────────────────────────────────────────────────

describe('handleButton', () => {
    test('appending digits updates expression and display', () => {
        const calc = createCalc();
        calc.handleButton('1');
        calc.handleButton('2');
        expect(calc.expression).toBe('12');
        expect(calc.display.value).toBe('12');
    });

    test('C clears expression and display', () => {
        const calc = createCalc();
        calc.handleButton('5');
        calc.handleButton('C');
        expect(calc.expression).toBe('');
        expect(calc.display.value).toBe('');
    });

    test('CE removes last character', () => {
        const calc = createCalc();
        calc.handleButton('4');
        calc.handleButton('2');
        calc.handleButton('CE');
        expect(calc.expression).toBe('4');
        expect(calc.display.value).toBe('4');
    });
});

// ── calculate ──────────────────────────────────────────────────────────

describe('calculate', () => {
    test('evaluates simple addition', () => {
        const calc = createCalc();
        calc.expression = '2+3';
        calc.calculate();
        expect(calc.display.value).toBe('5');
    });

    test('evaluates multiplication', () => {
        const calc = createCalc();
        calc.expression = '6*7';
        calc.calculate();
        expect(calc.display.value).toBe('42');
    });

    test('shows Error on invalid expression', () => {
        const calc = createCalc();
        calc.expression = '2++';
        calc.calculate();
        expect(calc.display.value).toBe('Error');
        expect(calc.expression).toBe('');
    });

    test('replaces ^ with ** for exponentiation', () => {
        const calc = createCalc();
        calc.expression = '2^3';
        calc.calculate();
        expect(calc.display.value).toBe('8');
    });
});

// ── addToHistory ───────────────────────────────────────────────────────

describe('addToHistory', () => {
    test('records entries up to 10 items', () => {
        const calc = createCalc();
        for (let i = 0; i < 12; i++) {
            calc.addToHistory(`entry-${i}`);
        }
        expect(calc.history.length).toBe(10);
        // Oldest entries should have been shifted out
        expect(calc.history[0]).toBe('entry-2');
    });

    test('updates the DOM history list', () => {
        const calc = createCalc();
        calc.addToHistory('2+3 = 5');
        const items = document.querySelectorAll('#history-list li');
        expect(items.length).toBe(1);
        expect(items[0].textContent).toBe('2+3 = 5');
    });
});

// ── loadMode ───────────────────────────────────────────────────────────

describe('loadMode', () => {
    test('scientific mode includes trig buttons', () => {
        const calc = createCalc();
        calc.loadMode('scientific');
        const labels = Array.from(document.querySelectorAll('#buttons button')).map(b => b.textContent);
        expect(labels).toContain('sin');
        expect(labels).toContain('cos');
        expect(labels).toContain('tan');
    });

    test('programmer mode includes hex/binary buttons', () => {
        const calc = createCalc();
        calc.loadMode('programmer');
        const labels = Array.from(document.querySelectorAll('#buttons button')).map(b => b.textContent);
        expect(labels).toContain('HEX');
        expect(labels).toContain('BIN');
        expect(labels).toContain('AND');
    });
});

// ── keyboard support ───────────────────────────────────────────────────

describe('keyboard support', () => {
    test('digit key press appends to expression', () => {
        const calc = createCalc();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
        expect(calc.expression).toBe('5');
    });

    test('Enter key triggers calculate', () => {
        const calc = createCalc();
        calc.expression = '3+4';
        calc.display.value = '3+4';
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(calc.display.value).toBe('7');
    });

    test('Escape key clears', () => {
        const calc = createCalc();
        calc.expression = '99';
        calc.display.value = '99';
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(calc.expression).toBe('');
    });

    test('Backspace removes last character', () => {
        const calc = createCalc();
        calc.expression = '42';
        calc.display.value = '42';
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
        expect(calc.expression).toBe('4');
    });
});
