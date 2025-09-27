#!/usr/bin/env node

require('./src/logger');

const BrowserController = require('./src/browser-controller');

async function startBrowser() {
  const browser = new BrowserController();

  try {
    logger.info('🚀 Starting persistent browser session...');
    await browser.initialize();

    logger.info('✅ Browser session ready!');
    logger.info('📝 Navigate to Tinder manually if needed');
    logger.info('🔧 Browser will stay open - press Ctrl+C to close when done');

    // Keep the process alive until user stops it
    process.on('SIGINT', async () => {
      logger.info('\n🛑 Shutting down browser...');
      await browser.cleanup();
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    logger.error('❌ Failed to start browser:', error.message);
    process.exit(1);
  }
}

startBrowser();