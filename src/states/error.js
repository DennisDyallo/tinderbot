const BaseState = require('./base-state');

class ErrorState extends BaseState {
    constructor() {
        super('ERROR');
        this.maxRetries = 3;
        this.recoveryDelay = 3000; // 3 seconds
    }

    async onEnter(data = {}) {
        await super.onEnter(data);

        const error = data.error || 'Unknown error';
        console.log('🚫 Error state entered:', error.message || error);

        this.currentError = error;
    }

    async execute() {
        if (this.isExitRequested()) {
            return { nextState: 'SHUTDOWN' };
        }

        try {
            // Get retry count from context or initialize
            const context = this.getContext();
            const retryCount = (context.errorRetryCount || 0) + 1;
            this.setContext('errorRetryCount', retryCount);

            console.log(`🔄 Error recovery attempt ${retryCount}/${this.maxRetries}`);

            if (retryCount > this.maxRetries) {
                console.log('💀 Maximum retries exceeded - shutting down');
                return { nextState: 'SHUTDOWN', data: { reason: 'Max retries exceeded' } };
            }

            // Wait for recovery delay with some randomization
            const delay = this.getHumanizedDelay(this.recoveryDelay, 30);
            console.log(`   ⏳ Recovery delay: ${Math.round(delay/1000)}s...`);
            await this.delay(delay);

            // Attempt to determine recovery path based on error type
            const recoveryState = this.determineRecoveryState();
            console.log(`   🔧 Attempting recovery via ${recoveryState} state`);

            // Reset retry count on successful recovery
            this.setContext('errorRetryCount', 0);

            return { nextState: recoveryState };

        } catch (error) {
            console.error('💥 Error during error recovery:', error.message);
            return { nextState: 'SHUTDOWN', data: { reason: 'Recovery failed' } };
        }
    }

    determineRecoveryState() {
        const errorMessage = this.currentError?.message || String(this.currentError);

        // Analyze error type and choose appropriate recovery path
        if (errorMessage.includes('profile') || errorMessage.includes('Profile')) {
            // Profile-related errors -> try waiting for profile again
            console.log('   📄 Profile-related error detected - retrying profile wait');
            return 'WAITING_FOR_PROFILE';
        } else if (errorMessage.includes('browser') || errorMessage.includes('Browser') || errorMessage.includes('page')) {
            // Browser-related errors -> more serious, might need re-initialization
            console.log('   🌐 Browser-related error detected - this may require manual intervention');
            return 'WAITING_FOR_PROFILE'; // Try basic recovery
        } else if (errorMessage.includes('timeout')) {
            // Timeout errors -> retry from waiting state
            console.log('   ⏱️  Timeout error detected - retrying from profile wait');
            return 'WAITING_FOR_PROFILE';
        } else {
            // Generic errors -> try from beginning of flow
            console.log('   🔄 Generic error - retrying from profile wait');
            return 'WAITING_FOR_PROFILE';
        }
    }

    async onExit(data = {}) {
        await super.onExit(data);
        console.log('🟢 Exiting error state - attempting recovery');
    }
}

module.exports = ErrorState;