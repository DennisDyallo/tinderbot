const BaseState = require('./base-state');

class IdleState extends BaseState {
    constructor() {
        super('IDLE');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);
        console.log('😴 IDLE state (fallback) - should not normally reach here');
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
            console.log('⚠️  IDLE state reached - waiting for profile to appear...');

            // Wait for profile photo directly instead of arbitrary delay
            const profileLoaded = await browser.waitForProfilePhoto();

            if (profileLoaded) {
                console.log('🔄 Profile loaded - transitioning to analyze');
                return { nextState: 'ANALYZING' };
            } else {
                console.log('❌ Profile load timeout in IDLE state');
                return { nextState: 'ERROR', data: { error: 'Profile load timeout in idle state' } };
            }

        } catch (error) {
            console.error('💥 Error during idle phase:', error.message);
            return { nextState: 'ERROR', data: { error } };
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
    }
}

module.exports = IdleState;