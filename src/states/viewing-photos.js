const BaseState = require('./base-state');

class ViewingPhotosState extends BaseState {
    constructor() {
        super('VIEWING_PHOTOS');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('📸 Starting to view profile photos...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        const browser = this.getBrowser();
        const behavior = this.getBehavior();

        if (!browser) {
            return { error: 'Browser not available in context' };
        }

        try {
            let photoData;
            let mouseData;

            if (behavior) {
                photoData = behavior.getPhotoViewingBehavior();
                mouseData = behavior.getMouseMovementBehavior();

                if (!photoData || !photoData.delays) {
                    console.log('⚠️  Invalid behavior photo data - using fallback');
                    photoData = this.getFallbackPhotoData();
                }
            } else {
                console.log('⚠️  No behavior profile available - using fallback photo viewing');
                photoData = this.getFallbackPhotoData();
                mouseData = null;
            }

            console.log(`   Will view ${photoData.count} photos`);

            // View photos with delays and optional mouse movements
            for (let i = 0; i < photoData.count; i++) {
                if (this.isExitRequested()) {
                    return { nextState: 'SHUTDOWN' };
                }

                const delay = photoData.delays[i] || 1000; // Fallback delay
                console.log(`   📷 Photo ${i + 1}/${photoData.count} - waiting ${delay}ms...`);

                await this.delay(delay);

                // Optional mouse movement based on behavior profile
                if (mouseData && mouseData.shouldMove) {
                    await this.performMouseMovement(browser, mouseData);
                }

                // Press spacebar to view next photo
                await browser.page.keyboard.press('Space');
                console.log(`   ✅ Spacebar pressed - next photo`);
            }

            console.log('✅ Photo viewing complete - ready to decide');
            return { nextState: 'DECIDING' };

        } catch (error) {
            console.error('💥 Error viewing photos:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    getFallbackPhotoData() {
        const count = Math.floor(Math.random() * 3) + 1; // 1-3 photos
        const delays = [];

        for (let i = 0; i < count; i++) {
            delays.push(this.getHumanizedDelay(1500, 60)); // 600-2400ms with variation
        }

        return { count, delays };
    }

    async performMouseMovement(browser, mouseData) {
        try {
            console.log(`   🖱️  Performing smooth mouse movement...`);

            // Get viewport size with fallbacks
            const viewport = browser.page.viewportSize();
            const width = viewport ? viewport.width : 1200;
            const height = viewport ? viewport.height : 800;

            // Generate random target coordinates within safe viewport bounds
            const targetX = Math.floor(Math.random() * (width - 100)) + 50;
            const targetY = Math.floor(Math.random() * (height - 100)) + 50;

            const startX = Math.floor(width / 2); // Start from center
            const startY = Math.floor(height / 2);

            // Use behavior profile data with fallbacks
            const totalDuration = mouseData.duration || 1500;
            const steps = mouseData.steps || 15;
            const stepDelay = Math.floor(totalDuration / steps);

            const deltaX = (targetX - startX) / steps;
            const deltaY = (targetY - startY) / steps;

            // Perform smooth movement
            for (let i = 0; i <= steps; i++) {
                const currentX = Math.round(startX + deltaX * i);
                const currentY = Math.round(startY + deltaY * i);

                await browser.page.mouse.move(currentX, currentY);

                if (i < steps) {
                    await this.delay(stepDelay);
                }
            }

            // Optional small pause after movement
            if (Math.random() < 0.3) {
                const pauseTime = this.getHumanizedDelay(200, 50); // 100-300ms
                await this.delay(pauseTime);
            }

        } catch (error) {
            console.log(`   🖱️  Mouse movement failed: ${error.message}`);
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = ViewingPhotosState;