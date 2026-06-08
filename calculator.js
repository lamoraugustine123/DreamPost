// Three-in-One Calculator JavaScript
class Calculator {
    constructor() {
        this.display = document.getElementById('display');
        this.buttons = document.getElementById('buttons');
        this.historyList = document.getElementById('history-list');
        this.currentMode = 'standard';
        this.history = [];
        this.expression = '';

        this.init();
    }

    init() {
        this.setupModeSwitcher();
        this.loadMode('standard');
        this.setupKeyboardSupport();
    }

    setupModeSwitcher() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentMode = btn.dataset.mode;
                this.loadMode(this.currentMode);
            });
        });
    }

    loadMode(mode) {
        this.buttons.innerHTML = '';
        const layouts = {
            standard: [
                ['7', '8', '9', '/'],
                ['4', '5', '6', '*'],
                ['1', '2', '3', '-'],
                ['0', '.', '=', '+'],
                ['C', 'CE']
            ],
            scientific: [
                ['sin', 'cos', 'tan', 'log'],
                ['ln', 'sqrt', '^', '('],
                ['7', '8', '9', ')'],
                ['4', '5', '6', '*'],
                ['1', '2', '3', '-'],
                ['0', '.', '=', '+'],
                ['C', 'CE', 'π', 'e']
            ],
            programmer: [
                ['A', 'B', 'C', 'D'],
                ['E', 'F', 'AND', 'OR'],
                ['7', '8', '9', 'XOR'],
                ['4', '5', '6', 'NOT'],
                ['1', '2', '3', 'MOD'],
                ['0', 'DEC', 'HEX', 'BIN'],
                ['C', 'CE', '=', 'SHL']
            ]
        };

        layouts[mode].forEach(row => {
            row.forEach(btn => {
                const button = document.createElement('button');
                button.textContent = btn;
                button.className = 'btn';
                if (['/', '*', '-', '+', '=', 'AND', 'OR', 'XOR', 'NOT', 'MOD', 'SHL'].includes(btn)) {
                    button.classList.add('operator');
                } else if (btn === '=') {
                    button.classList.add('equals');
                } else if (btn === 'C' || btn === 'CE') {
                    button.classList.add('clear');
                }
                button.addEventListener('click', () => this.handleButton(btn));
                this.buttons.appendChild(button);
            });
        });
    }

    handleButton(value) {
        if (value === 'C') {
            this.expression = '';
            this.display.value = '';
        } else if (value === 'CE') {
            this.expression = this.expression.slice(0, -1);
            this.display.value = this.expression;
        } else if (value === '=') {
            this.calculate();
        } else {
            this.expression += value;
            this.display.value = this.expression;
        }
    }

    calculate() {
        try {
            let expr = this.expression;
            // Replace functions for scientific mode
            expr = expr.replace(/sin\(/g, 'Math.sin(');
            expr = expr.replace(/cos\(/g, 'Math.cos(');
            expr = expr.replace(/tan\(/g, 'Math.tan(');
            expr = expr.replace(/log\(/g, 'Math.log10(');
            expr = expr.replace(/ln\(/g, 'Math.log(');
            expr = expr.replace(/sqrt\(/g, 'Math.sqrt(');
            expr = expr.replace(/\^/g, '**');
            expr = expr.replace(/π/g, 'Math.PI');
            expr = expr.replace(/e/g, 'Math.E');

            // For programmer mode, handle bases if needed
            if (this.currentMode === 'programmer') {
                // Simple handling, assume decimal input
                // For advanced, would need to parse bases
            }

            const result = eval(expr);
            this.display.value = result;
            this.addToHistory(`${this.expression} = ${result}`);
            this.expression = result.toString();
        } catch (error) {
            this.display.value = 'Error';
            this.expression = '';
        }
    }

    addToHistory(entry) {
        this.history.push(entry);
        if (this.history.length > 10) {
            this.history.shift();
        }
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        this.historyList.innerHTML = '';
        this.history.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            this.historyList.appendChild(li);
        });
    }

    setupKeyboardSupport() {
        document.addEventListener('keydown', (e) => {
            const key = e.key;
            if (key >= '0' && key <= '9') {
                this.handleButton(key);
            } else if (['+', '-', '*', '/', '=', 'Enter'].includes(key)) {
                if (key === 'Enter') {
                    this.handleButton('=');
                } else {
                    this.handleButton(key);
                }
            } else if (key === 'Backspace') {
                this.handleButton('CE');
            } else if (key === 'Escape') {
                this.handleButton('C');
            }
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculator;
} else {
    new Calculator();
}