#!/usr/bin/env node

import { spawn } from 'child_process';

let backend, frontend;
let isShuttingDown = false;

// Restore terminal state on exit while preserving log output
const cleanupTerminal = () => {
  // Restore cursor visibility and reset colors without clearing logs
  process.stdout.write('\x1b[?25h'); // Show cursor
  process.stdout.write('\x1b[0m');   // Reset colors
};

// Handle graceful shutdown of development servers
const shutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\nReceived ${signal}, shutting down development servers...`);
  
  // Terminate processes gracefully
  if (frontend) {
    frontend.kill('SIGTERM');
  }
  if (backend) {
    backend.kill('SIGTERM');
  }
  
  // Force cleanup after 5 seconds
  setTimeout(() => {
    if (frontend) frontend.kill('SIGKILL');
    if (backend) backend.kill('SIGKILL');
    cleanupTerminal();
    process.exit(0);
  }, 5000);
  
  // Check if both processes are done
  let backendDone = !backend;
  let frontendDone = !frontend;
  
  const checkIfDone = () => {
    if (backendDone && frontendDone) {
      cleanupTerminal();
      console.log('All servers stopped successfully');
      process.exit(0);
    }
  };
  
  if (backend) {
    backend.on('close', () => {
      backendDone = true;
      checkIfDone();
    });
  }
  
  if (frontend) {
    frontend.on('close', () => {
      frontendDone = true;
      checkIfDone();
    });
  }
};

// Register signal handlers for graceful shutdown
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', cleanupTerminal);

console.log('Starting development servers...');

// Start backend server
backend = spawn('pnpm', ['--dir', 'backend', 'dev'], {
  stdio: 'inherit',
  shell: true,
  detached: false // Keep in same process group for signal handling
});

// Handle unexpected backend exit
backend.on('close', (code) => {
  if (!isShuttingDown && code !== 0) {
    console.log(`Backend exited with code ${code}`);
    shutdown('BACKEND_EXIT');
  }
});

// Start frontend server after backend initialization delay
setTimeout(() => {
  console.log('Starting frontend server...');
  frontend = spawn('pnpm', ['dev:frontend'], {
    stdio: 'inherit', 
    shell: true,
    detached: false
  });

  // Handle unexpected frontend exit
  frontend.on('close', (code) => {
    if (!isShuttingDown && code !== 0) {
      console.log(`Frontend exited with code ${code}`);
      shutdown('FRONTEND_EXIT');
    }
  });
}, 3000);
