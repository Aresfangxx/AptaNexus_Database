import { spawn } from 'child_process';

const child = spawn('node', ['dist/src/index.js'], {
  cwd: 'd:\\Aptamer-Database\\mcp-server',
  env: { ...process.env, APTAMERS_PATH: 'd:\\Aptamer-Database\\APTAMERS.jsonl' },
  stdio: ['pipe', 'pipe', 'inherit']
});

const messages = [];

child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const msg = JSON.parse(line);
        messages.push(msg);
        console.log('Received:', JSON.stringify(msg, null, 2));
      } catch (e) {
        console.error('Parse error:', line);
      }
    }
  });
});

// Send initialize request
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };
  console.log('Sending initialize:', JSON.stringify(initRequest));
  child.stdin.write(JSON.stringify(initRequest) + '\n');
}, 100);

// Send list tools request after initialization
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  console.log('Sending tools/list:', JSON.stringify(listToolsRequest));
  child.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 500);

// Exit after 3 seconds
setTimeout(() => {
  console.log('\n=== Test completed ===');
  child.kill();
  process.exit(0);
}, 3000);
