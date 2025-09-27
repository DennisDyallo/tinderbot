class UserInteractionHandler {
  constructor(page) {
    logger.log("🔧 UserInteractionHandler constructor - page:", page ? "✅ Available" : "❌ NULL/UNDEFINED");
    this.page = page;
    if (!this.page) {
      logger.error("❌ UserInteractionHandler: page is null/undefined!");
    } else {
      logger.log("✅ UserInteractionHandler initialized with valid page");
    }
  }

  async clickLikeButton() {
    logger.log("💖 Pressing right arrow to send LIKE...");

    try {
      await this.page.keyboard.press("ArrowRight");
      logger.log("✅ Right arrow pressed (LIKE sent)");
      return true;
    } catch (error) {
      logger.error("❌ Failed to press right arrow:", error.message);
      return false;
    }
  }

  async clickNopeButton() {
    logger.log("👎 Pressing left arrow to send NOPE...");

    try {
      await this.page.keyboard.press("ArrowLeft");
      logger.log("✅ Left arrow pressed (NOPE sent)");
      return true;
    } catch (error) {
      logger.error("❌ Failed to press left arrow:", error.message);
      return false;
    }
  }

  async viewPhotos(behavior) {
    if (!behavior || !behavior.photoViewing) {
      logger.log("⚠️  No photo viewing behavior provided - skipping photos");
      return true;
    }

    const { count, delays } = behavior.photoViewing;

    if (count === 0) {
      logger.log("📸 Skipping photo viewing (count: 0)");
      return true;
    }

    logger.log(`📸 Viewing ${count} photos with delays: [${delays.join(', ')}ms]`);
    logger.log("🔧 Checking page object for photo viewing:", this.page ? "✅ Available" : "❌ NULL/UNDEFINED");

    try {
      for (let i = 0; i < count; i++) {
        logger.log(`   📷 Viewing photo ${i + 1}/${count}...`);

        // Press spacebar to view next photo
        logger.log("🔧 Calling this.page.keyboard.press('Space')...");
        await this.page.keyboard.press("Space");

        // Wait for the specified delay for this photo
        if (i < delays.length) {
          const delay = delays[i];
          logger.log(`   ⏳ Viewing delay: ${delay}ms`);
          await this.delay(delay);
        }
      }

      logger.log("✅ Photo viewing completed");
      return true;

    } catch (error) {
      logger.error("❌ Error during photo viewing:", error.message);
      return false;
    }
  }

  async performMouseMovement(behavior) {
    if (!behavior || !behavior.mouseMovement || !behavior.mouseMovement.shouldMove) {
      logger.log("🖱️  Skipping mouse movement");
      return true;
    }

    const { duration, steps } = behavior.mouseMovement;
    logger.log(`🖱️  Performing smooth mouse movement (${duration}ms, ${steps} steps)`);
    logger.log("🔧 Checking page object:", this.page ? "✅ Available" : "❌ NULL/UNDEFINED");

    try {
      let width, height;

      logger.log("🔧 Calling this.page.viewportSize()...");
      const viewport = this.page.viewportSize();
      if (!viewport) {
        logger.log("⚠️  Could not get viewport size - using default size");
        // Use default viewport size
        width = 1200;
        height = 800;
      } else {
        width = viewport.width;
        height = viewport.height;
      }

      // Generate random target position
      const startX = Math.floor(width * 0.3);
      const startY = Math.floor(height * 0.4);
      const endX = Math.floor(width * (0.4 + Math.random() * 0.3));
      const endY = Math.floor(height * (0.3 + Math.random() * 0.4));

      logger.log(`   🎯 Moving from (${startX}, ${startY}) to (${endX}, ${endY})`);

      // Move to start position
      await this.page.mouse.move(startX, startY);

      // Smooth movement with multiple steps
      const stepDuration = duration / steps;

      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const x = Math.round(startX + (endX - startX) * progress);
        const y = Math.round(startY + (endY - startY) * progress);

        await this.page.mouse.move(x, y);
        await this.delay(stepDuration);
      }

      logger.log("✅ Mouse movement completed");
      return true;

    } catch (error) {
      logger.log(`   🖱️  Mouse move failed: ${error.message}`);
      return false;
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = UserInteractionHandler;