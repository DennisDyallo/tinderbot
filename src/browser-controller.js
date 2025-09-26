const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

class BrowserController {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.userDataDir = path.join(__dirname, '..', 'browser-data');
  }

  async initialize() {
    console.log("🥷 Launching persistent browser...");

    try {
      // Ensure user data directory exists
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
        console.log("📁 Created browser data directory");
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

      console.log("✅ Persistent browser context launched");

      // Get existing pages or create new one
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
        console.log("🔄 Reusing existing browser tab");

        // Check if already on Tinder
        const currentUrl = this.page.url();
        if (!currentUrl.includes('tinder.com')) {
          console.log("🌐 Navigating to Tinder...");
          await this.page.goto("https://tinder.com/app/recs", {
            waitUntil: "domcontentloaded",
          });
        } else {
          console.log("✅ Already on Tinder - session maintained!");
        }
      } else {
        this.page = await this.context.newPage();
        console.log("📄 Created new browser tab");

        await this.page.goto("https://tinder.com/app/recs", {
          waitUntil: "domcontentloaded",
        });
      }

      // Essential anti-detection script
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

      console.log("👤 Persistent browser ready");

    } catch (error) {
      console.error("❌ Failed to launch persistent browser:", error.message);
      console.log("🔄 Falling back to regular browser...");
      await this.fallbackToRegularBrowser();
    }
  }

  async fallbackToRegularBrowser() {
    console.log("🔄 Starting regular browser fallback...");

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

      // Essential anti-detection script
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

      console.log("✅ Fallback browser launched successfully");

    } catch (fallbackError) {
      console.error("💥 Fallback browser also failed:", fallbackError.message);
      throw new Error("Both persistent and regular browser failed to launch");
    }
  }

  async cleanup() {
    try {
      if (this.context) {
        // For persistent context, just close without destroying user data
        await this.context.close();
        console.log("🔒 Browser context closed (data preserved)");
      }
      if (this.browser) {
        await this.browser.close();
        console.log("🔒 Browser closed");
      }
    } catch (error) {
      console.log("⚠️  Error during cleanup:", error.message);
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

    // First check for the green dot indicator (most reliable)
    const dotSelector = 'div[class*="Bgc($c-ds-background-badge-online-now-default)"]';

    try {
      const greenDot = await this.page.$(dotSelector);
      if (greenDot && await greenDot.isVisible()) {
        console.log("✅ Found Recently Active - green dot indicator detected!");
        return true;
      }
    } catch (error) {
      console.log(`   Green dot check failed: ${error.message}`);
    }

    // Fallback to text-based detection
    const textSelectors = [
      'span:has-text("Recently Active")',
      'span:text-is("Recently Active")',
      'span.C\\(\\$c-ds-text-primary-overlay\\).Typs\\(body-2-regular\\)--ml.Typs\\(body-3-regular\\)',
      'span[class*="C($c-ds-text-primary-overlay)"]',
      '[data-testid*="recently-active"]'
    ];

    try {
      for (let i = 0; i < textSelectors.length; i++) {
        const selector = textSelectors[i];
        console.log(`📍 Trying text selector ${i + 1}/${textSelectors.length}: ${selector}`);

        try {
          const elements = await this.page.$$(selector);
          console.log(`   Found ${elements.length} elements with this selector`);

          for (const element of elements) {
            const textContent = await element.textContent();
            const isVisible = await element.isVisible();
            console.log(`   Element text: "${textContent}", visible: ${isVisible}`);

            if (textContent && textContent.includes("Recently Active") && isVisible) {
              console.log(`✅ Found Recently Active - text detection using selector: ${selector}`);
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
    console.log("💖 Sending RIGHT arrow key for LIKE...");

    try {
      await this.page.keyboard.press('ArrowRight');
      console.log("✅ RIGHT arrow key pressed successfully - LIKE sent!");
      await this.delay(1000);
      return true;

    } catch (error) {
      console.error("💥 Error pressing RIGHT arrow key:", error.message);
      return false;
    }
  }

  async clickNopeButton() {
    console.log("👎 Sending LEFT arrow key for NOPE...");

    try {
      await this.page.keyboard.press('ArrowLeft');
      console.log("✅ LEFT arrow key pressed successfully - NOPE sent!");
      await this.delay(1000);
      return true;

    } catch (error) {
      console.error("💥 Error pressing LEFT arrow key:", error.message);
      return false;
    }
  }

  async viewPhotos(behavior) {
    console.log("📸 Viewing profile photos...");

    try {
      // Check if behavior parameter is provided
      if (!behavior) {
        console.error("❌ No behavior profile provided to viewPhotos()");
        // Fallback to simple photo viewing
        return await this.viewPhotosSimple();
      }

      const photoData = behavior.getPhotoViewingBehavior();

      // Additional safety check
      if (!photoData || !photoData.delays) {
        console.error("❌ Invalid photo behavior data");
        return await this.viewPhotosSimple();
      }

      console.log(`   Will view ${photoData.count} photos`);

      for (let i = 0; i < photoData.count; i++) {
        const delay = photoData.delays[i] || 1000; // Fallback delay
        console.log(`   📷 Photo ${i + 1}/${photoData.count} - waiting ${delay}ms...`);

        await this.delay(delay);

        // Mouse movement based on behavior profile
        const mouseData = behavior.getMouseMovementBehavior();
        if (mouseData && mouseData.shouldMove) {
          await this.randomMouseMove(mouseData);
        }

        await this.page.keyboard.press('Space');
        console.log(`   ✅ Spacebar pressed - next photo`);
      }

      return true;

    } catch (error) {
      console.error("💥 Error viewing photos:", error.message);
      console.log("🔄 Falling back to simple photo viewing");
      return await this.viewPhotosSimple();
    }
  }

  async viewPhotosSimple() {
    console.log("📸 Simple photo viewing (fallback)...");

    try {
      // Simple fallback: view 1-3 photos with random delays
      const count = Math.floor(Math.random() * 3) + 1;
      console.log(`   Will view ${count} photos (simple mode)`);

      for (let i = 0; i < count; i++) {
        const delay = Math.floor(Math.random() * 2500) + 500;
        console.log(`   📷 Photo ${i + 1}/${count} - waiting ${delay}ms...`);

        await this.delay(delay);
        await this.page.keyboard.press('Space');
        console.log(`   ✅ Spacebar pressed - next photo`);
      }

      return true;
    } catch (error) {
      console.error("💥 Even simple photo viewing failed:", error.message);
      return false;
    }
  }

  async randomMouseMove(mouseData) {
    try {
      // Safety check for mouseData parameter
      if (!mouseData) {
        console.log(`   🖱️  No mouse data provided, skipping mouse movement`);
        return;
      }

      // Get viewport size
      const viewport = this.page.viewportSize();
      const width = viewport ? viewport.width : 1200;
      const height = viewport ? viewport.height : 800;

      // Get current mouse position (start from center if unknown)
      const startX = 600;
      const startY = 400;

      // Generate random target coordinates within viewport
      const targetX = Math.floor(Math.random() * (width - 100)) + 50;
      const targetY = Math.floor(Math.random() * (height - 100)) + 50;

      console.log(`   🖱️  Smoothly moving mouse to (${targetX}, ${targetY})`);

      // Use centralized timing from behavior profile with fallbacks
      const totalDuration = mouseData.duration || 1500;
      const steps = mouseData.steps || 15;
      const stepDelay = Math.floor(totalDuration / steps);

      const deltaX = (targetX - startX) / steps;
      const deltaY = (targetY - startY) / steps;

      // Perform smooth movement
      for (let i = 0; i <= steps; i++) {
        const currentX = Math.round(startX + deltaX * i);
        const currentY = Math.round(startY + deltaY * i);

        await this.page.mouse.move(currentX, currentY);

        // Consistent step delay to maintain total duration
        if (i < steps) {
          await this.delay(stepDelay);
        }
      }

      // Sometimes add a small pause after movement
      if (Math.random() < 0.3) {
        const pauseTime = Math.floor(Math.random() * 300) + 100;
        await this.delay(pauseTime);
      }

    } catch (error) {
      console.log(`   🖱️  Mouse move failed: ${error.message}`);
    }
  }

  async dismissDialogs() {
    console.log("🔍 Checking for popup dialogs...");

    try {
      // Check for Add to Home Screen dialog
      const homeScreenDialog = await this.checkAndDismissDialog(
        'div[role="dialog"][aria-modal="true"]',
        'button:has-text("Not interested")',
        'Add to Home Screen'
      );

      // Check for Super Like dialog
      const superLikeDialog = await this.checkAndDismissDialog(
        'div[role="dialog"][aria-modal="true"]',
        'button:has-text("No Thanks")',
        'Super Like'
      );

      return homeScreenDialog || superLikeDialog;

    } catch (error) {
      console.log(`⚠️  Dialog dismissal failed: ${error.message}`);
      return false;
    }
  }

  async checkAndDismissDialog(dialogSelector, dismissButtonSelector, dialogType) {
    try {
      // Check if dialog exists
      const dialog = await this.page.$(dialogSelector);
      if (!dialog) return false;

      // Verify it's visible
      const isVisible = await dialog.isVisible();
      if (!isVisible) return false;

      console.log(`🚨 Found ${dialogType} dialog - dismissing...`);

      // Find and click dismiss button
      const dismissButton = await this.page.$(dismissButtonSelector);
      if (dismissButton && await dismissButton.isVisible()) {
        await dismissButton.click();
        console.log(`✅ ${dialogType} dialog dismissed`);

        // Wait for dialog to disappear
        await this.page.waitForSelector(dialogSelector, {
          state: 'hidden',
          timeout: 3000
        }).catch(() => {});

        return true;
      } else {
        console.log(`⚠️  ${dialogType} dialog found but dismiss button not found`);
        return false;
      }

    } catch (error) {
      console.log(`⚠️  Error handling ${dialogType} dialog: ${error.message}`);
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

  async waitForProfilePhoto() {
    const selectors = [
      'div[aria-label="Profile Photo 1"]', // Primary selector from HTML analysis
      'div[aria-label^="Profile Photo"]',  // General profile photo selector
      'div[role="img"][aria-label*="Profile Photo"]',
      'div.StretchedBox[aria-label^="Profile Photo"]',
      'div.StretchedBox[role="img"]' // Fallback for StretchedBox images
    ];

    console.log('🔍 Waiting for profile photo to appear...');

    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 500; // Check every 500ms

    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < maxWaitTime) {
      attempts++;

      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];

        try {
          const elements = await this.page.$$(selector);

          if (elements.length > 0) {
            for (const element of elements) {
              const isVisible = await element.isVisible();
              const ariaLabel = await element.getAttribute('aria-label');

              if (isVisible && ariaLabel && ariaLabel.includes('Profile Photo')) {
                console.log(`✅ Profile photo found: "${ariaLabel}" using selector: ${selector}`);
                return true;
              }
            }
          }
        } catch (selectorError) {
          continue;
        }
      }

      // Progress feedback every 5 seconds
      if (attempts % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`   🔄 Still waiting for profile... (${elapsed}s/${maxWaitTime/1000}s)`);
      }

      await this.delay(checkInterval);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`❌ Profile photo wait timeout after ${totalTime}s`);
    return false;
  }
}

module.exports = BrowserController;
