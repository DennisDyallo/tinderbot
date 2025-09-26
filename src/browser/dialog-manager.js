class DialogManager {
  constructor(page) {
    this.page = page;
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

  async checkForSpecificDialog(dialogType) {
    const dialogConfigs = {
      'homeScreen': {
        dialogSelector: 'div[role="dialog"][aria-modal="true"]',
        dismissSelector: 'button:has-text("Not interested")',
        identifier: (dialog) => dialog.textContent?.includes('Add Tinder to your Home Screen')
      },
      'superLike': {
        dialogSelector: 'div[role="dialog"][aria-modal="true"]',
        dismissSelector: 'button:has-text("No Thanks")',
        identifier: (dialog) => dialog.textContent?.includes('Upgrade Your Like')
      }
    };

    const config = dialogConfigs[dialogType];
    if (!config) {
      console.log(`⚠️  Unknown dialog type: ${dialogType}`);
      return false;
    }

    try {
      const dialogs = await this.page.$$(config.dialogSelector);

      for (const dialog of dialogs) {
        const isVisible = await dialog.isVisible();
        if (isVisible && config.identifier(dialog)) {
          console.log(`🚨 Found ${dialogType} dialog`);
          return true;
        }
      }

      return false;

    } catch (error) {
      console.log(`⚠️  Error checking for ${dialogType} dialog: ${error.message}`);
      return false;
    }
  }

  async dismissSpecificDialog(dialogType) {
    const exists = await this.checkForSpecificDialog(dialogType);
    if (!exists) return false;

    const dialogConfigs = {
      'homeScreen': {
        dismissSelector: 'button:has-text("Not interested")',
        name: 'Add to Home Screen'
      },
      'superLike': {
        dismissSelector: 'button:has-text("No Thanks")',
        name: 'Super Like'
      }
    };

    const config = dialogConfigs[dialogType];
    if (!config) return false;

    try {
      const dismissButton = await this.page.$(config.dismissSelector);
      if (dismissButton && await dismissButton.isVisible()) {
        await dismissButton.click();
        console.log(`✅ ${config.name} dialog dismissed`);
        return true;
      }
      return false;
    } catch (error) {
      console.log(`⚠️  Error dismissing ${config.name} dialog: ${error.message}`);
      return false;
    }
  }
}

module.exports = DialogManager;