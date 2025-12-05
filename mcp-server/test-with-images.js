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
        console.log('Received message:', msg.id || msg.method);

        // Don't print the full content if it contains images
        if (msg.result && msg.result.content) {
          console.log(`  Content items: ${msg.result.content.length}`);
          msg.result.content.forEach((item, idx) => {
            if (item.type === 'text') {
              console.log(`  [${idx}] Text: ${item.text.substring(0, 100)}...`);
            } else if (item.type === 'image') {
              console.log(`  [${idx}] Image: ${item.mimeType}, ${item.data.length} bytes (base64)`);
            }
          });
        }
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
  console.log('\n[1] Sending initialize');
  child.stdin.write(JSON.stringify(initRequest) + '\n');
}, 100);

// Send tools/list request
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  console.log('\n[2] Sending tools/list');
  child.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 500);

// Test top_by_pkd with images
setTimeout(() => {
  const topByPkdRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'top_by_pkd',
      arguments: {
        query: 'thrombin',
        top: 2,
        include_images: true
      }
    }
  };
  console.log('\n[3] Sending tools/call: top_by_pkd for thrombin (with images)');
  child.stdin.write(JSON.stringify(topByPkdRequest) + '\n');
}, 1000);

// Exit after 5 seconds
setTimeout(() => {
  console.log('\n=== Test completed ===');
  child.kill();
  process.exit(0);
}, 5000);
