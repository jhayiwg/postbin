#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const command = process.argv[2] || 'start';
const portArgIndex = process.argv.indexOf('--port');
const port = portArgIndex > -1 ? process.argv[portArgIndex + 1] : '5555';

const scriptPath = path.join(__dirname, '..', 'dist', 'index.js');
const pidFile = path.join(__dirname, '..', '.postbin.pid');
const logFile = path.join(__dirname, '..', 'postbin.log');

// Ensure the project is built
if (!fs.existsSync(scriptPath)) {
  console.log('Building project...');
  execSync('npm run build', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
}

function getPid() {
  if (fs.existsSync(pidFile)) {
    return parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
  }
  return null;
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

switch (command) {
  case 'start':
    console.log(`Starting Postbin on port ${port}...`);
    const currentPid = getPid();
    if (currentPid && isRunning(currentPid)) {
      console.log(`Postbin is already running (PID: ${currentPid})`);
      process.exit(0);
    }
    
    try {
      const out = fs.openSync(logFile, 'a');
      const err = fs.openSync(logFile, 'a');
      
      const child = spawn(process.execPath, [scriptPath], {
        detached: true,
        stdio: ['ignore', out, err],
        env: { ...process.env, PORT: port }
      });
      
      child.unref();
      fs.writeFileSync(pidFile, child.pid.toString());
      
      console.log(`\n✅ Postbin is now running in the background (PID: ${child.pid})!`);
      console.log(`👉 Send requests to: http://localhost:${port}/any-app-name`);
      console.log(`👉 View UI dashboard: http://localhost:${port}/manage/any-app-name`);
      console.log(`\nTo stop: postbin stop`);
      console.log(`To view logs: postbin logs`);
    } catch (e) {
      console.error('Failed to start daemon:', e.message);
    }
    break;

  case 'stop':
    console.log('Stopping Postbin...');
    const pidToStop = getPid();
    if (pidToStop && isRunning(pidToStop)) {
      try {
        process.kill(pidToStop);
        fs.unlinkSync(pidFile);
        console.log('Postbin stopped.');
      } catch (e) {
        console.error('Failed to stop process:', e.message);
      }
    } else {
      console.log('Postbin is not running.');
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
    }
    break;

  case 'restart':
    execSync(`node ${__filename} stop`, { stdio: 'inherit' });
    setTimeout(() => {
      execSync(`node ${__filename} start --port ${port}`, { stdio: 'inherit' });
    }, 1000);
    break;

  case 'status':
    const statPid = getPid();
    if (statPid && isRunning(statPid)) {
      console.log(`🟢 Postbin is RUNNING (PID: ${statPid})`);
    } else {
      console.log(`🔴 Postbin is STOPPED`);
    }
    break;

  case 'logs':
    if (fs.existsSync(logFile)) {
      // Very simple cross-platform tail
      const tail = spawn('tail', ['-f', logFile], { stdio: 'inherit' });
    } else {
      console.log('No logs found yet.');
    }
    break;

  default:
    console.log(`
Usage: postbin <command> [options]

Commands:
  start [--port 5555]   Start the postbin daemon in the background
  stop                  Stop the background daemon
  restart               Restart the daemon
  status                Show running status
  logs                  Tail the daemon logs
    `);
    break;
}
