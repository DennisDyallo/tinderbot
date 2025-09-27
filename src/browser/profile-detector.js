class ProfileDetector {
  constructor(page) {
    this.page = page;
  }

  async checkForRecentlyActive() {
    logger.log("🔍 Checking profile for Recently Active status...");

    // First check for the green dot indicator (most reliable)
    const dotSelector = 'div[class*="Bgc($c-ds-background-badge-online-now-default)"]';

    try {
      const greenDot = await this.page.$(dotSelector);
      if (greenDot && await greenDot.isVisible()) {
        logger.log("✅ Found Recently Active - green dot indicator detected!");
        return true;
      }
    } catch (error) {
      logger.log(`   Green dot check failed: ${error.message}`);
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
        logger.log(`📍 Trying text selector ${i + 1}/${textSelectors.length}: ${selector}`);

        try {
          const elements = await this.page.$$(selector);
          logger.log(`   Found ${elements.length} elements with this selector`);

          for (const element of elements) {
            const textContent = await element.textContent();
            const isVisible = await element.isVisible();
            logger.log(`   Element text: "${textContent}", visible: ${isVisible}`);

            if (textContent && textContent.includes("Recently Active") && isVisible) {
              logger.log(`✅ Found Recently Active - text detection using selector: ${selector}`);
              return true;
            }
          }
        } catch (selectorError) {
          logger.log(`   Selector failed: ${selectorError.message}`);
          continue;
        }
      }

      logger.log("❌ Recently Active not found - profile not recently active");
      return false;

    } catch (error) {
      logger.error("💥 Error checking Recently Active:", error.message);
      await this.takeDebugScreenshot("recently-active-error");
      return false;
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

    logger.log('🔍 Waiting for profile photo to appear...');

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
                logger.log(`✅ Profile photo found: "${ariaLabel}" using selector: ${selector}`);
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
        logger.log(`   🔄 Still waiting for profile... (${elapsed}s/${maxWaitTime/1000}s)`);
      }

      await this.delay(checkInterval);
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);
    logger.log(`❌ Profile photo wait timeout after ${totalTime}s`);
    return false;
  }

  async waitForProfileIcon() {
    logger.log("🔍 Waiting for profile icon (login verification)...");

    const selectors = [
      'button[data-testid="profile-icon"]',
      'button[aria-label*="Profile"]',
      'div[data-testid="profile-menu-button"]',
      'button:has-text("Profile")',
    ];

    const maxWaitTime = 30000;
    const checkInterval = 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      for (const selector of selectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            logger.log("✅ Profile icon found - login verified");
            return true;
          }
        } catch (error) {
          continue;
        }
      }

      await this.delay(checkInterval);

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 5 === 0 && elapsed > 0) {
        logger.log(`   ⏳ Still waiting for login... (${elapsed}s)`);
      }
    }

    logger.log("❌ Profile icon not found - login may be required");
    return false;
  }

  async takeDebugScreenshot(filename) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fullFilename = `debug-${filename}-${timestamp}.png`;
      await this.page.screenshot({
        path: fullFilename,
        fullPage: false
      });
      logger.log(`📸 Debug screenshot saved: ${fullFilename}`);
    } catch (error) {
      logger.log(`📸 Could not save screenshot: ${error.message}`);
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ProfileDetector;