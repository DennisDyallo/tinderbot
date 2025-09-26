const BaseState = require('./base-state');

class WaitingForProfileState extends BaseState {
    constructor() {
        super('WAITING_FOR_PROFILE');
        this.maxWaitTime = 30000; // 30 seconds maximum wait
        this.checkInterval = 500; // Check every 500ms
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('⏳ Waiting for first profile to load...');
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
            const profileFound = await browser.waitForProfilePhoto();

            if (profileFound) {
                console.log('✅ Profile loaded - ready to analyze');

                // Add small human reaction delay after profile loads
                const reactionDelay = this.getHumanizedDelay(125, 60); // 50-200ms with variation
                console.log(`   😌 Human reaction delay: ${reactionDelay}ms`);
                await this.delay(reactionDelay);

                return { nextState: 'ANALYZING' };
            } else {
                console.log('❌ Profile loading timeout - retrying');
                return { nextState: 'ERROR', data: { error: 'Profile loading timeout' } };
            }

        } catch (error) {
            console.error('💥 Error waiting for profile:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }


    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = WaitingForProfileState;