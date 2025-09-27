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
    logger.info("🔧 BrowserController initializing...");
    await this.lifecycleManager.initialize();

    const page = this.lifecycleManager.getPage();
    logger.info("🔧 Page object from lifecycle manager:", page ? "✅ Available" : "❌ NULL/UNDEFINED");

    if (!page) {
      throw new Error("Browser initialization failed - no page available");
    }

    // Initialize components with the page
    logger.info("🔧 Initializing ProfileDetector...");
    this.profileDetector = new ProfileDetector(page);

    logger.info("🔧 Initializing UserInteractionHandler...");
    this.interactionHandler = new UserInteractionHandler(page);

    logger.info("🔧 Initializing DialogManager...");
    this.dialogManager = new DialogManager(page);

    logger.info("✅ BrowserController initialization complete");
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
    logger.info("🔧 BrowserController.viewPhotos() called");
    if (!this.interactionHandler) {
      throw new Error("UserInteractionHandler not initialized");
    }
    logger.info("🔧 Delegating to interactionHandler.viewPhotos()");
    return await this.interactionHandler.viewPhotos(behavior);
  }

  async performMouseMovement(behavior) {
    logger.info("🔧 BrowserController.performMouseMovement() called");
    if (!this.interactionHandler) {
      throw new Error("UserInteractionHandler not initialized");
    }
    logger.info("🔧 Delegating to interactionHandler.performMouseMovement()");
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
    try {
      await this.lifecycleManager.cleanup();
    } catch (error) {
      logger.error("⚠️  BrowserController cleanup error:", error.message);
    }
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
