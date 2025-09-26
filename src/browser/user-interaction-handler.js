class UserInteractionHandler {
  constructor(page) {
    this.page = page;
  }

  async clickLikeButton() {
    console.log("💖 Pressing right arrow to send LIKE...");

    try {
      await this.page.keyboard.press("ArrowRight");
      console.log("✅ Right arrow pressed (LIKE sent)");
      return true;
    } catch (error) {
      console.error("❌ Failed to press right arrow:", error.message);
      return false;
    }
  }

  async clickNopeButton() {
    console.log("👎 Pressing left arrow to send NOPE...");

    try {
      await this.page.keyboard.press("ArrowLeft");
      console.log("✅ Left arrow pressed (NOPE sent)");
      return true;
    } catch (error) {
      console.error("❌ Failed to press left arrow:", error.message);
      return false;
    }
  }

  async viewPhotos(behavior) {
    if (!behavior || !behavior.photoViewing) {
      console.log("⚠️  No photo viewing behavior provided - skipping photos");
      return true;
    }

    const { count, delays } = behavior.photoViewing;

    if (count === 0) {
      console.log("📸 Skipping photo viewing (count: 0)");
      return true;
    }

    console.log(`📸 Viewing ${count} photos with delays: [${delays.join(', ')}ms]`);

    try {
      for (let i = 0; i < count; i++) {
        console.log(`   📷 Viewing photo ${i + 1}/${count}...`);

        // Press spacebar to view next photo
        await this.page.keyboard.press("Space");

        // Wait for the specified delay for this photo
        if (i < delays.length) {
          const delay = delays[i];
          console.log(`   ⏳ Viewing delay: ${delay}ms`);
          await this.delay(delay);
        }
      }

      console.log("✅ Photo viewing completed");
      return true;

    } catch (error) {
      console.error("❌ Error during photo viewing:", error.message);
      return false;
    }
  }

  async performMouseMovement(behavior) {
    if (!behavior || !behavior.mouseMovement || !behavior.mouseMovement.shouldMove) {
      console.log("🖱️  Skipping mouse movement");
      return true;
    }

    const { duration, steps } = behavior.mouseMovement;
    console.log(`🖱️  Performing smooth mouse movement (${duration}ms, ${steps} steps)`);

    try {
      const viewport = this.page.viewportSize();
      if (!viewport) {
        console.log("⚠️  Could not get viewport size - skipping mouse movement");
        return true;
      }

      // Generate random target position
      const startX = Math.floor(viewport.width * 0.3);
      const startY = Math.floor(viewport.height * 0.4);
      const endX = Math.floor(viewport.width * (0.4 + Math.random() * 0.3));
      const endY = Math.floor(viewport.height * (0.3 + Math.random() * 0.4));

      console.log(`   🎯 Moving from (${startX}, ${startY}) to (${endX}, ${endY})`);

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

      console.log("✅ Mouse movement completed");
      return true;

    } catch (error) {
      console.log(`   🖱️  Mouse move failed: ${error.message}`);
      return false;
    }
  }

  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = UserInteractionHandler;