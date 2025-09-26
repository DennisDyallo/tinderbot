const { chromium } = require("playwright");

class BrowserController {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log("🥷 Launching stealth browser...");

    this.browser = await chromium.launch({
      headless: false,
      slowMo: 100,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        // Removed --start-maximized
      ],
    });

    // No viewport override - let browser use natural size
    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      // Removed viewport override
      locale: "en-US",
      timezoneId: "Europe/Stockholm",
    });

    this.page = await this.context.newPage();

    // Essential anti-detection only
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

    await this.page.goto("https://tinder.com/app/recs", {
      waitUntil: "domcontentloaded",
    });

    console.log("👤 Natural viewport - navigated to Tinder");
  }

  async cleanup() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
      console.log("🔒 Browser closed");
    }
  }

  async waitForProfileIcon() {
    console.log('⏳ Waiting for login - looking for "You" profile icon...');

    const selectors = [
      'a[title="My Profile"]', // Generic fallback
      'a[href="/app/profile"]', // More specific fallback
      "#s1952229479 > div > div.App__body\\.H\\(100\\%\\)\\.Pos\\(r\\)\\.Z\\(0\\) > div > aside > nav > a", // Your exact selector
      'aside nav a[href="/app/profile"]', // Simplified version
    ];

    let profileFound = false;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max wait

    while (!profileFound && attempts < maxAttempts) {
      for (const selector of selectors) {
        try {
          const element = await this.page.waitForSelector(selector, {
            timeout: 2000,
          });
          if (element) {
            // Double-check it contains "You" text
            const text = await element.textContent();
            if (text && text.includes("You")) {
              console.log("✅ Profile icon found - User is logged in!");
              return;
            }
          }
        } catch (e) {
          // Try next selector
        }
      }

      attempts++;
      console.log(`🔄 Still waiting for login... (${attempts}/${maxAttempts})`);
      await this.delay(2000);
    }

    throw new Error("❌ Login timeout - Profile icon not found");
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async checkForRecentlyActive() {
    console.log("🔍 Checking profile for Recently Active status...");

    const selectors = [
      'span.C\\(\\$c-ds-text-primary-overlay\\).Typs\\(body-2-regular\\)--ml.Typs\\(body-3-regular\\)',
      'span:has-text("Recently Active")',
      'span[class*="C($c-ds-text-primary-overlay)"]',
      '[data-testid*="recently-active"]',
      'span:text-is("Recently Active")'
    ];

    try {
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        console.log(`📍 Trying selector ${i + 1}/${selectors.length}: ${selector}`);

        try {
          const elements = await this.page.$$(selector);
          console.log(`   Found ${elements.length} elements with this selector`);

          for (const element of elements) {
            const textContent = await element.textContent();
            const isVisible = await element.isVisible();
            console.log(`   Element text: "${textContent}", visible: ${isVisible}`);

            if (textContent && textContent.includes("Recently Active") && isVisible) {
              console.log("✅ Found Recently Active - profile is recently active!");
              return true;
            }
          }
        } catch (selectorError) {
          console.log(`   Selector failed: ${selectorError.message}`);
          continue;
        }
      }

      console.log("❌ Recently Active not found - profile not recently active");
      return false;

    } catch (error) {
      console.error("💥 Error checking Recently Active:", error.message);
      await this.takeDebugScreenshot("recently-active-error");
      return false;
    }
  }

  async clickLikeButton() {
    console.log("💖 Attempting to click LIKE button...");

    const selectors = [
      'button[class*="Bgc($c-ds-background-gamepad-sparks-like-default)"]',
      'button svg[stroke*="sparks-like"]',
      'button .gamepad-icon-wrapper svg[stroke="var(--color--border-sparks-like, inherit)"]',
      'button:has(span:text-is("Like"))',
      'button span .gamepad-icon-wrapper svg[stroke*="sparks-like"]',
      '//*[@id="main-content"]/div[1]/div/div/div/div[1]/div/div/div[5]/div/div[4]/button',
      'button:has(svg[stroke*="sparks-like"])',
      'button[aria-label*="like" i]',
      'button[data-testid*="like"]',
      '.gamepadButtonContainer button:nth-child(4)'
    ];

    try {
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        console.log(`💝 Trying like selector ${i + 1}/${selectors.length}: ${selector}`);

        try {
          let element;
          if (selector.startsWith('//*')) {
            element = await this.page.locator(`xpath=${selector}`).first();
          } else {
            element = await this.page.locator(selector).first();
          }

          const isVisible = await element.isVisible({ timeout: 2000 });
          const isEnabled = await element.isEnabled();

          console.log(`   Like button - visible: ${isVisible}, enabled: ${isEnabled}`);

          if (isVisible && isEnabled) {
            await element.click();
            console.log("✅ LIKE button clicked successfully!");
            await this.delay(1000);
            return true;
          }
        } catch (selectorError) {
          console.log(`   Like selector failed: ${selectorError.message}`);
          continue;
        }
      }

      console.log("❌ Could not find or click LIKE button");
      await this.takeDebugScreenshot("like-button-error");
      return false;

    } catch (error) {
      console.error("💥 Error clicking LIKE button:", error.message);
      await this.takeDebugScreenshot("like-button-critical-error");
      return false;
    }
  }

  async clickNopeButton() {
    console.log("👎 Attempting to click NOPE button...");

    const selectors = [
      'button[class*="Bgc($c-ds-background-gamepad-sparks-nope-default)"]',
      'button svg[stroke*="sparks-nope"]',
      'button .gamepad-icon-wrapper svg[stroke="var(--color--border-sparks-nope, inherit)"]',
      'button:has(span:text-is("Nope"))',
      '//*[@id="main-content"]/div[1]/div/div/div/div[1]/div/div/div[5]/div/div[2]/button',
      'button span .gamepad-icon-wrapper svg:not([stroke*="sparks-like"])',
      'button[aria-label*="pass" i]',
      'button[aria-label*="nope" i]',
      '.gamepadButtonContainer button:nth-child(2)'
    ];

    try {
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        console.log(`💔 Trying nope selector ${i + 1}/${selectors.length}: ${selector}`);

        try {
          let element;
          if (selector.startsWith('//*')) {
            element = await this.page.locator(`xpath=${selector}`).first();
          } else {
            element = await this.page.locator(selector).first();
          }

          const isVisible = await element.isVisible({ timeout: 2000 });
          const isEnabled = await element.isEnabled();

          console.log(`   Nope button - visible: ${isVisible}, enabled: ${isEnabled}`);

          if (isVisible && isEnabled) {
            await element.click();
            console.log("✅ NOPE button clicked successfully!");
            await this.delay(1000);
            return true;
          }
        } catch (selectorError) {
          console.log(`   Nope selector failed: ${selectorError.message}`);
          continue;
        }
      }

      console.log("❌ Could not find or click NOPE button");
      await this.takeDebugScreenshot("nope-button-error");
      return false;

    } catch (error) {
      console.error("💥 Error clicking NOPE button:", error.message);
      await this.takeDebugScreenshot("nope-button-critical-error");
      return false;
    }
  }

  async takeDebugScreenshot(filename) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fullFilename = `debug-${filename}-${timestamp}.png`;
      await this.page.screenshot({
        path: fullFilename,
        fullPage: false
      });
      console.log(`📸 Debug screenshot saved: ${fullFilename}`);
    } catch (error) {
      console.log(`📸 Could not save screenshot: ${error.message}`);
    }
  }
}

module.exports = BrowserController;
