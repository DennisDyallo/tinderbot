const BaseState = require('./base-state');

class ShutdownState extends BaseState {
    constructor() {
        super('SHUTDOWN');
    }

    async onEnter(data = {}) {
        await super.onEnter(data);

        const reason = data.reason || 'User requested shutdown';
        logger.log(`🛑 Shutdown initiated: ${reason}`);
    }

    async execute() {
        logger.log('🧹 Beginning cleanup process...');

        try {
            const browser = this.getBrowser();
            const hotkeys = this.getHotkeys();

            // Cleanup browser
            if (browser) {
                await browser.cleanup();
                logger.log('✅ Browser cleanup completed');
            }

            // Cleanup hotkeys
            if (hotkeys) {
                hotkeys.cleanup();
                logger.log('✅ Hotkey handler cleanup completed');
            }

            logger.log('✅ All cleanup completed successfully');

        } catch (error) {
            logger.error('⚠️  Error during cleanup:', error.message);
            logger.log('🔄 Shutdown will proceed despite cleanup errors');
        }

        logger.log('🏁 Shutdown complete - goodbye!');

        // Signal state machine to stop
        if (this.stateMachine) {
            this.stateMachine.stop();
        }

        // This state never transitions - it ends the state machine
        return null;
    }

    async onExit(data = {}) {
        // This state should never exit - it's terminal
        logger.log('❌ Warning: Shutdown state should not exit');
    }
}

module.exports = ShutdownState;