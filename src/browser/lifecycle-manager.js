const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

class BrowserLifecycleManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, '..', '..', 'browser-data');
  }

  async initialize() {
    logger.log("🥷 Launching persistent browser...");

    try {
      // Ensure user data directory exists
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
        logger.log("📁 Created browser data directory");
      }

      // Try to launch persistent context (reuses existing session)
      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: false,
        slowMo: 100,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--no-sandbox",
        ],
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale: "en-US",
        timezoneId: "Europe/Stockholm",
      });

      logger.log("✅ Persistent browser context launched");

      // Get existing pages or create new one
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
        logger.log("🔄 Reusing existing browser tab");

        // Check if already on Tinder
        const currentUrl = this.page.url();
        if (!currentUrl.includes('tinder.com')) {
          logger.log("🌐 Navigating to Tinder...");
          await this.page.goto("https://tinder.com/app/recs", {
            waitUntil: "domcontentloaded",
          });
        } else {
          logger.log("✅ Already on Tinder - session maintained!");
        }
      } else {
        this.page = await this.context.newPage();
        logger.log("📄 Created new browser tab");

        await this.page.goto("https://tinder.com/app/recs", {
          waitUntil: "domcontentloaded",
        });
      }

      // Essential anti-detection script
      await this.addAntiDetectionScript();

      logger.log("👤 Persistent browser ready");

    } catch (error) {
      logger.error("❌ Failed to launch persistent browser:", error.message);
      logger.log("🔄 Falling back to regular browser...");
      await this.fallbackToRegularBrowser();
    }
  }

  async addAntiDetectionScript() {
    await this.page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Override chrome runtime
      window.chrome = {
        runtime: {},
      };

      // Override plugins length
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
    });
  }

  async fallbackToRegularBrowser() {
    logger.log("🔄 Starting regular browser fallback...");

    try {
      this.browser = await chromium.launch({
        headless: false,
        slowMo: 100,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--no-sandbox",
        ],
      });

      this.context = await this.browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale: "en-US",
        timezoneId: "Europe/Stockholm",
      });

      this.page = await this.context.newPage();

      await this.addAntiDetectionScript();

      await this.page.goto("https://tinder.com/app/recs", {
        waitUntil: "domcontentloaded",
      });

      logger.log("✅ Fallback browser launched successfully");

    } catch (fallbackError) {
      logger.error("💥 Fallback browser also failed:", fallbackError.message);
      throw new Error("Both persistent and regular browser failed to launch");
    }
  }

  async cleanup() {
    try {
      if (this.context) {
        // For persistent context, just close without destroying user data
        await this.context.close();
        logger.log("🔒 Browser context closed (data preserved)");
      }

      if (this.browser) {
        await this.browser.close();
        logger.log("🔒 Browser closed");
      }
    } catch (error) {
      logger.error("⚠️  Browser cleanup error:", error.message);
    }
  }

  getPage() {
    logger.log("🔧 BrowserLifecycleManager.getPage() called - page:", this.page ? "✅ Available" : "❌ NULL/UNDEFINED");
    return this.page;
  }

  isInitialized() {
    return this.page !== null;
  }
}

module.exports = BrowserLifecycleManager;