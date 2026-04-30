# Copilot Instructions for Prototype Project

## Project Overview
This codebase is a web prototype featuring static HTML pages for user sign-up, login, and status display, alongside a standalone Java terminal calculator. It's designed as a simple frontend demonstration without backend integration.

## Architecture
- **Web Pages**: Static HTML files with linked CSS and minimal JS
  - `main-signUp.html`: Registration form with two-column layout
  - `login/index.html`: Login form
  - `status.html`: Success confirmation page
- **Calculator**: Independent Java application (`calcus.java`) for terminal-based calculations
- **No Backend/Database**: Forms use `action="#"` and don't persist data; status page shows mock success message

## Key Components & Data Flow
- Pages navigate via hardcoded localhost URLs (e.g., `http://127.0.0.1:5500/status.html`)
- Sign-up form collects user details but doesn't submit; submit button triggers alert and redirects
- Login form has no validation or authentication logic
- Calculator handles basic arithmetic with error handling for division/modulo by zero

## Development Workflow
- **Running Web Pages**: Open HTML files directly in browser or use VS Code Live Server (port 5500 as referenced in links)
- **Running Calculator**: Compile and run Java file: `javac calcus.java && java TerminalCalculator`
- **No Build/Test Process**: Pure static files, no package managers or automated tests

## Project-Specific Patterns
- **HTML Structure**: Two-column form layout in sign-up using `.column1` and `.column2` classes
- **JavaScript Usage**: Minimal; e.g., `onclick` handler calls `alt()` function for alert before navigation
- **CSS Classes**: Consistent naming like `.container`, `.content-div`, `.sub` for styling
- **Form Inputs**: Specific placeholders (e.g., "lamorasante@gamill") and validation attributes (minlength, required)
- **Navigation**: Mix of `<a>` links and button redirects; terminate button has no functionality

## Conventions
- File organization: Main pages in root, login in subfolder
- No external dependencies or frameworks
- Error handling in Java calculator with try-catch for invalid inputs
- Inline event handlers in HTML rather than separate JS files

## Integration Points
- None; fully standalone components
- Calculator is completely separate from web pages

Reference files: `main-signUp.html`, `calcus.java`, `main.js` for examples of patterns.