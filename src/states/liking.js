const BaseState = require('./base-state');

class LikingState extends BaseState {
    constructor() {
        super('LIKING');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('💖 Sending LIKE...');
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        const browser = this.getBrowser();
        if (!browser) {
            return { error: 'Browser not available in context' };
        }

        try {
            const likeSuccess = await browser.clickLikeButton();

            if (likeSuccess) {
                console.log('✅ LIKE sent successfully');
                console.log('⏳ Waiting for next profile to appear...');

                // Wait for the next profile photo to load
                const nextProfileLoaded = await browser.waitForProfilePhoto();

                if (nextProfileLoaded) {
                    console.log('🔄 Next profile loaded - ready to analyze');

                    // Track profile completion for behavior evolution
                    const behavior = this.getBehavior();
                    if (behavior) {
                        behavior.onProfileCompleted();
                    }

                    return { nextState: 'ANALYZING' }; // Skip IDLE, go straight to analyzing
                } else {
                    console.log('❌ Timeout waiting for next profile');
                    return { nextState: 'ERROR', data: { error: 'Next profile load timeout' } };
                }
            } else {
                console.log('❌ Failed to send LIKE - sending NOPE as fallback');

                const nopeSuccess = await browser.clickNopeButton();
                if (nopeSuccess) {
                    console.log('👎 NOPE sent as fallback');
                    console.log('⏳ Waiting for next profile to appear...');

                    // Wait for next profile after nope as well
                    const nextProfileLoaded = await browser.waitForProfilePhoto();
                    if (nextProfileLoaded) {
                        console.log('🔄 Next profile loaded - ready to analyze');

                        // Track profile completion for behavior evolution
                        const behavior = this.getBehavior();
                        if (behavior) {
                            behavior.onProfileCompleted();
                        }

                        return { nextState: 'ANALYZING' };
                    } else {
                        console.log('❌ Timeout waiting for next profile');
                        return { nextState: 'ERROR', data: { error: 'Next profile load timeout after fallback nope' } };
                    }
                } else {
                    console.log('💥 Both LIKE and NOPE failed');
                    return { nextState: 'ERROR', data: { error: 'Both like and nope actions failed' } };
                }
            }

        } catch (error) {
            console.error('💥 Error sending LIKE:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = LikingState;