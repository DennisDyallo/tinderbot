const BaseState = require('./base-state');

class ViewingPhotosState extends BaseState {
    constructor() {
        super('VIEWING_PHOTOS');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        logger.log(' Starting to view profile photos...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        // Check for dialogs that might interrupt the flow
        await this.checkForDialogs();

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
                    logger.log('⚠️  Invalid behavior photo data - using fallback');
                    photoData = this.getFallbackPhotoData();
                }
            } else {
                logger.log('⚠️  No behavior profile available - using fallback photo viewing');
                photoData = this.getFallbackPhotoData();
                mouseData = null;
            }

            logger.log(`   Will view ${photoData.count} photos`);

            // Use the refactored browser controller methods
            const viewPhotosSuccess = await browser.viewPhotos(behavior);
            if (!viewPhotosSuccess) {
                logger.log('⚠️  Photo viewing failed - continuing anyway');
            }

            // Perform optional mouse movement
            if (mouseData && mouseData.shouldMove) {
                const mouseSuccess = await browser.performMouseMovement(behavior);
                if (!mouseSuccess) {
                    logger.log('⚠️  Mouse movement failed - continuing anyway');
                }
            }

            logger.log(' Photo viewing complete - ready to decide');
            return { nextState: 'DECIDING' };

        } catch (error) {
            logger.error('💥 Error viewing photos:', error.message);
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


    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = ViewingPhotosState;