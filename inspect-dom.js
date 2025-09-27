#!/usr/bin/env node

require('./src/logger');

const DOMInspector = require('./src/dom-inspector');

async function main() {
  const inspector = new DOMInspector();

  try {
    await inspector.connect();
    await inspector.captureCurrentPageInfo();
    await inspector.startMonitoring();
  } catch (error) {
    logger.error('❌ Inspector failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main();