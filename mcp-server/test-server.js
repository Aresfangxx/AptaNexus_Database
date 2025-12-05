import { spawn } from 'child_process';

const child = spawn('node', ['dist/src/index.js'], {
  cwd: 'd:\\Aptamer-Database\\mcp-server',
  env: { ...process.env, APTAMERS_PATH: 'd:\\Aptamer-Database\\APTAMERS.jsonl' },
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  console.log('Response:', data.toString());
  child.kill();
  process.exit(0);
});

child.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
  child.kill();
  process.exit(1);
});

setTimeout(() => {
  child.stdin.write('{"id":1,"method":"aptamers.list_targets"}\n');
}, 1000);

setTimeout(() => {
  console.error('Timeout!');
  child.kill();
  process.exit(1);
}, 5000);
