const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Store login state in user home config folder to prevent git commits
const os = require('os');
const AUTH_STATE_FILE = path.join(os.homedir(), '.notebooklm-mcp', 'playwright_auth_state.json');
const NOTEBOOK_ID = '47861196-dfb2-42e4-8dcd-cfc9eeb28ced';

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function queryNotebookLM(promptText) {
  const hasSession = fs.existsSync(AUTH_STATE_FILE);
  console.log(`[Playwright] Launching browser (headless: ${hasSession})...`);
  
  const browser = await chromium.launch({ 
    headless: hasSession,
    channel: 'chrome' // Use local Chrome if available, fallback to Chromium
  }).catch(() => chromium.launch({ headless: hasSession }));

  const mcpDir = path.dirname(AUTH_STATE_FILE);
  if (!fs.existsSync(mcpDir)) {
    fs.mkdirSync(mcpDir, { recursive: true });
  }

  let context;
  if (hasSession) {
    context = await browser.newContext({ storageState: AUTH_STATE_FILE });
  } else {
    context = await browser.newContext();
  }

  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  const url = `https://notebooklm.google.com/notebook/${NOTEBOOK_ID}`;
  console.log(`[Playwright] Navigating to: ${url}`);
  
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });

  // Wait a bit to check if we are redirected to login
  await page.waitForTimeout(5000);

  if (page.url().includes('accounts.google.com')) {
    console.log('\n================================================================');
    console.log('🔑 YÊU CẦU: Vui lòng đăng nhập tài khoản Google của anh trên cửa sổ trình duyệt vừa mở.');
    console.log('Sau khi đăng nhập thành công và trang web tự chuyển hướng về NotebookLM, quay lại đây nhấn phím Enter để tiếp tục.');
    console.log('================================================================\n');
    
    if (hasSession) {
      // Re-run in headed mode if the saved session has expired
      console.log('[Playwright] Saved session expired. Restarting in headed mode...');
      fs.unlinkSync(AUTH_STATE_FILE);
      await browser.close();
      return queryNotebookLM(promptText);
    }

    await askQuestion('Nhấn Enter sau khi đã đăng nhập xong...');
    
    // Save storage state for next runs
    await context.storageState({ path: AUTH_STATE_FILE });
    console.log('[Playwright] Đã lưu phiên đăng nhập thành công.');
  }

  console.log('[Playwright] Waiting for Chat input area...');
  try {
    await page.waitForSelector('textarea.query-box-input', { timeout: 30000 });
  } catch (err) {
    console.log('[Playwright] Input selector not found. Retrying in headed mode to verify session...');
    if (fs.existsSync(AUTH_STATE_FILE)) {
      fs.unlinkSync(AUTH_STATE_FILE);
    }
    await browser.close();
    return queryNotebookLM(promptText);
  }

  console.log('[Playwright] Typing prompt...');
  await page.fill('textarea.query-box-input', promptText);
  
  console.log('[Playwright] Clicking submit...');
  await page.click('button.submit-button');

  console.log('[Playwright] Waiting for response to stream and stabilize...');
  
  // Wait for response text to appear and stop changing
  const responseText = await page.evaluate(async () => {
    const container = document.querySelector('.chat-panel-content');
    if (!container) return null;

    const getLastMessageText = () => {
      const children = container.children;
      if (children.length === 0) return '';
      return children[children.length - 1].innerText || '';
    };

    let lastText = '';
    let noChangeCount = 0;

    for (let i = 0; i < 90; i++) { // Max 90s
      await new Promise(resolve => setTimeout(resolve, 1000));
      const currentText = getLastMessageText();
      
      // If we see text and it matches previous second's text
      if (currentText && currentText === lastText) {
        noChangeCount++;
        // If text is stable for 5 consecutive seconds and doesn't look like a loading indicator
        if (noChangeCount >= 5 && currentText.trim().length > 10) {
          return currentText;
        }
      } else {
        if (currentText) {
          lastText = currentText;
          noChangeCount = 0;
        }
      }
    }
    return getLastMessageText();
  });

  if (!responseText || responseText.length < 50) {
    console.error('[Playwright] Error: Failed to extract valid response or response was too short.');
    await browser.close();
    process.exit(1);
  }

  console.log('[Playwright] Query successful. Response length:', responseText.length);
  await browser.close();
  return responseText;
}

// If run directly
if (require.main === module) {
  const prompt = process.argv[2];
  if (!prompt) {
    console.error('Usage: node query_notebook_playwright.js "<prompt>"');
    process.exit(1);
  }
  queryNotebookLM(prompt).then(res => {
    console.log('\n--- RESPONSE CONTENT ---');
    console.log(res);
  }).catch(err => {
    console.error('Playwright error:', err);
    process.exit(1);
  });
}

module.exports = { queryNotebookLM };
