const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DreamPost server with sync worker...');

// Start the main server
const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Start the sync worker
const workerProcess = spawn('node', ['sync-worker.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Handle process events
serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error);
});

workerProcess.on('error', (error) => {
    console.error('❌ Worker error:', error);
});

serverProcess.on('close', (code) => {
    console.log(`📋 Server exited with code ${code}`);
});

workerProcess.on('close', (code) => {
    console.log(`📋 Worker exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    serverProcess.kill('SIGINT');
    workerProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Shutting down...');
    serverProcess.kill('SIGTERM');
    workerProcess.kill('SIGTERM');
    process.exit(0);
});
