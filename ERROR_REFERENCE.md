# DreamPost Error Reference Guide

## 🔍 Error Pattern 1: DOM Element Access

### Error: `Cannot set properties of null (setting 'textContent')`
**Example**: `app.js:1367 Uncaught (in promise) TypeError: Cannot set properties of null (setting 'textContent')`

**Cause**: Trying to access DOM element that doesn't exist
**Location**: renderStats function line 1367: `elements.dreamCount.textContent = posts.length;`

**Root Cause**: HTML has `sidebarDreamCount` but JavaScript looks for `dreamCount`

### ✅ Prevention Pattern:
```javascript
// ❌ WRONG - Direct access without null check
elements.dreamCount.textContent = posts.length;

// ✅ CORRECT - Always check element existence
if (elements.dreamCount) {
    console.log('📊 Updating dreamCount element');
    elements.dreamCount.textContent = posts.length;
} else {
    console.log('❌ dreamCount element not found');
}
```

### 🔧 Debugging Steps:
1. Check if element ID exists in HTML
2. Verify element ID matches exactly (case-sensitive)
3. Add null safety check
4. Add console logging for debugging

---

## 🔍 Error Pattern 2: Missing Event Listeners

### Error: `Uncaught ReferenceError: [functionName] is not defined`
**Example**: `app.js:569 Uncaught ReferenceError: handleUserDropdownAction is not defined`

**Cause**: Function called but not implemented
**Location**: Event listener calls undefined function

### ✅ Prevention Pattern:
```javascript
// ❌ WRONG - Function called but not defined
elements.button.addEventListener('click', handleUndefinedFunction);

// ✅ CORRECT - Always implement referenced functions
function handleUndefinedFunction() {
    console.log('🎯 Function implemented');
    // Implementation here
}

// ✅ CORRECT - Add event listener with debugging
if (elements.button) {
    console.log('🔧 Adding button listener');
    elements.button.addEventListener('click', () => {
        console.log('🔧 Button clicked');
        handleUndefinedFunction();
    });
}
```

---

## 🔍 Error Pattern 3: Async Function Errors

### Error: `Uncaught (in promise) [error]`
**Example**: Promise rejection in async function

**Cause**: Unhandled promise rejection
**Location**: `await Promise.all([renderFeed(), renderProfile(), renderStats()])`

### ✅ Prevention Pattern:
```javascript
// ❌ WRONG - No error handling
async function riskyFunction() {
    const data = await fetch('/api/data');
    return data.json();
}

// ✅ CORRECT - Always handle async errors
async function safeFunction() {
    try {
        console.log('📡 Fetching data...');
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('📡 Data received:', data);
        return data;
    } catch (error) {
        console.error('❌ Fetch error:', error);
        showToast(error.message);
        return null;
    }
}
```

---

## 📋 Element Existence Checklist

### Before Accessing DOM Elements:
- [ ] Check if element exists in HTML
- [ ] Verify element ID matches exactly
- [ ] Add null safety check
- [ ] Add console logging

### Common Missing Elements:
- `dreamCount` → Should be `sidebarDreamCount`
- `profileBadgeCount` → May not exist in HTML
- `badgesPanel` → May not exist in HTML
- `profileLikes` → May not exist in HTML
- `streakCount` → May not exist in HTML

---

## 🔧 Debugging Commands

### Check Element Existence:
```javascript
// In browser console
console.log('Element exists:', !!document.getElementById('elementId'));
console.log('Element:', document.getElementById('elementId'));
```

### Check Function Existence:
```javascript
// In browser console
console.log('Function exists:', typeof functionName);
console.log('Function:', functionName);
```

### Check Event Listeners:
```javascript
// In browser console
console.log('Listeners:', getEventListeners(document.getElementById('elementId')));
```

---

## 🚨 Error Prevention Rules

### Rule 1: Always Check Element Existence
```javascript
if (elements.elementId) {
    // Safe to manipulate
} else {
    console.log('❌ Element not found: elementId');
}
```

### Rule 2: Always Add Console Logs
```javascript
function functionName() {
    console.log('🔧 functionName called');
    // Function implementation
}
```

### Rule 3: Always Handle Async Errors
```javascript
try {
    // Async operation
} catch (error) {
    console.error('❌ Error:', error);
    showToast(error.message);
}
```

### Rule 4: Always Implement Referenced Functions
```javascript
// If function is called anywhere, it MUST be defined
function handleAction(action) {
    console.log('🎯 Handling action:', action);
    // Implementation
}
```

---

## 📊 Error Resolution Flow

1. **Identify Error Type** - TypeError, ReferenceError, Network Error
2. **Locate Source** - Find exact line and context
3. **Check Pattern** - Match against common patterns
4. **Apply Fix** - Use appropriate prevention strategy
5. **Add Debugging** - Comprehensive console logging
6. **Test Fix** - Verify with browser console
7. **Document** - Add to this reference guide

---

## 🎯 Specific Fixes Applied

### Fix 1: renderStats Function (Line 1367)
**Problem**: `elements.dreamCount.textContent = posts.length;` - element doesn't exist
**Solution**: Added null safety and debugging
**Result**: Will log error instead of crashing

### Fix 2: updateDashboardStats Function
**Problem**: Direct element access without null checks
**Solution**: Added null safety for all elements
**Result**: Graceful handling of missing elements

---

**Last Updated**: 2026-04-30
**Version**: 1.0
**Purpose**: Prevent common JavaScript errors in DreamPost application
