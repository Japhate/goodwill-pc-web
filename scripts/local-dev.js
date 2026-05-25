import { spawn } from 'node:child_process';

const server = spawn(process.execPath, ['--watch-path=server', 'server/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    LOCAL_VITE_DEV: 'true',
    PORT: '3001',
  },
  stdio: 'inherit',
});

server.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => server.kill());
process.on('SIGTERM', () => server.kill());
