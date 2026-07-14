const { spawn } = require('child_process');

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

if (!command || (command !== 'list' && command !== 'query')) {
  console.log('Usage:');
  console.log('  node scripts/query_notebook.js list');
  console.log('  node scripts/query_notebook.js query <notebook_id> "<query_text>"');
  process.exit(1);
}

const child = spawn('npx', ['notebooklm-mcp-server', 'server'], {
  shell: true
});

let buffer = '';
let messageId = 1;
let hasInitialized = false;

child.stdout.on('data', (data) => {
  buffer += data.toString();
  tryParseMessages();
});

child.stderr.on('data', (data) => {
  // Silence debug/warning logs on stderr unless they are errors
  if (data.toString().includes('Error')) {
    console.error('STDERR:', data.toString().trim());
  }
});

child.on('close', (code) => {
  if (code !== 0 && code !== null) {
    process.exit(code);
  }
});

function tryParseMessages() {
  const lines = buffer.split('\n');
  buffer = lines.pop();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      handleMessage(msg);
    } catch (e) {
      // not JSON
    }
  }
}

function send(method, params = {}, id = null) {
  const msg = { jsonrpc: '2.0', method, params };
  if (id !== null) msg.id = id;
  child.stdin.write(JSON.stringify(msg) + '\n');
}

// 1. Initial Handshake
send('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'query-client', version: '1.0.0' }
}, messageId++);

function handleMessage(msg) {
  // If error response from server
  if (msg.error) {
    console.error('Server Error:', JSON.stringify(msg.error, null, 2));
    child.kill();
    process.exit(1);
  }

  if (msg.id === 1) {
    // Handshake response received
    send('notifications/initialized');
    hasInitialized = true;
    
    // 2. Refresh Auth to ensure cookies are picked up, then call target tool
    send('tools/call', {
      name: 'refresh_auth',
      arguments: {}
    }, messageId++);
  } 
  else if (msg.id === 2) {
    // Auth refreshed, now call the target command
    if (command === 'list') {
      send('tools/call', {
        name: 'notebook_list',
        arguments: {}
      }, 100);
    } else if (command === 'query') {
      send('tools/call', {
        name: 'notebook_query',
        arguments: {
          notebook_id: arg1,
          query: arg2
        }
      }, 100);
    }
  } 
  else if (msg.id === 100) {
    // Target tool output received
    if (msg.result && msg.result.content && msg.result.content[0]) {
      console.log(msg.result.content[0].text);
    } else {
      console.log(JSON.stringify(msg.result, null, 2));
    }
    child.kill();
  }
}
