const BrowserLifecycleManager = require('./browser/lifecycle-manager');
const ProfileDetector = require('./browser/profile-detector');
const UserInteractionHandler = require('./browser/user-interaction-handler');
const DialogManager = require('./browser/dialog-manager');

class BrowserController {
  constructor() {
    this.lifecycleManager = new BrowserLifecycleManager();
    this.profileDetector = null;
    this.interactionHandler = null;
    this.dialogManager = null;
  }

  async initialize() {
    await this.lifecycleManager.initialize();

    const page = this.lifecycleManager.getPage();
    if (!page) {
      throw new Error("Browser initialization failed - no page available");
    }

    // Initialize components with the page
    this.profileDetector = new ProfileDetector(page);
    this.interactionHandler = new UserInteractionHandler(page);
    this.dialogManager = new DialogManager(page);
  }

  // Profile detection methods - delegate to ProfileDetector
  async checkForRecentlyActive() {
    if (!this.profileDetector) {
      throw new Error("ProfileDetector not initialized");
    }
    return await this.profileDetector.checkForRecentlyActive();
  }

  async waitForProfilePhoto() {
    if (!this.profileDetector) {
      throw new Error("ProfileDetector not initialized");
    }
    return await this.profileDetector.waitForProfilePhoto();
  }

  async waitForProfileIcon() {
    if (!this.profileDetector) {
      throw new Error("ProfileDetector not initialized");
    }
    return await this.profileDetector.waitForProfileIcon();
  }

  // User interaction methods - delegate to UserInteractionHandler
  async clickLikeButton() {
    if (!this.interactionHandler) {
      throw new Error("UserInteractionHandler not initialized");
    }
    return await this.interactionHandler.clickLikeButton();
  }

  async clickNopeButton() {
    if (!this.interactionHandler) {
      throw new Error("UserInteractionHandler not initialized");
    }
    return await this.interactionHandler.clickNopeButton();
  }

  async viewPhotos(behavior) {
    if (!this.interactionHandler) {
      throw new Error("UserInteractionHandler not initialized");
    }
    return await this.interactionHandler.viewPhotos(behavior);
  }

  async performMouseMovement(behavior) {
    if (!this.interactionHandler) {
      throw new Error("UserInteractionHandler not initialized");
    }
    return await this.interactionHandler.performMouseMovement(behavior);
  }

  // Dialog management methods - delegate to DialogManager
  async dismissDialogs() {
    if (!this.dialogManager) {
      throw new Error("DialogManager not initialized");
    }
    return await this.dialogManager.dismissDialogs();
  }

  // Lifecycle management methods - delegate to BrowserLifecycleManager
  async cleanup() {
    await this.lifecycleManager.cleanup();
  }

  // Utility methods
  getPage() {
    return this.lifecycleManager.getPage();
  }

  isInitialized() {
    return this.lifecycleManager.isInitialized();
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = BrowserController;
