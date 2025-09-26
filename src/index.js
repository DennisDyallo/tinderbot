const BrowserController = require('./browser-controller');
const HotkeyHandler = require('./hotkey-handler');
const BehaviorProfile = require('./behavior-profile');
const StateMachine = require('./state-machine');
const RandomProvider = require('./random-provider');

// Import all state classes
const WaitingForProfileState = require('./states/waiting-for-profile');
const AnalyzingState = require('./states/analyzing');
const ThinkingState = require('./states/thinking');
const ViewingPhotosState = require('./states/viewing-photos');
const DecidingState = require('./states/deciding');
const LikingState = require('./states/liking');
const NopingState = require('./states/noping');
const IdleState = require('./states/idle');
const ErrorState = require('./states/error');
const ShutdownState = require('./states/shutdown');

class TinderBot {
    constructor(randomProvider = null) {
        this.browser = new BrowserController();
        this.hotkeys = new HotkeyHandler();
        this.isRunning = false;
        this.randomProvider = randomProvider || RandomProvider.getInstance();
        this.stateMachine = new StateMachine();
        this.setupStateMachine();
    }

    setupStateMachine() {
        // Register all states
        this.stateMachine.registerState('WAITING_FOR_PROFILE', new WaitingForProfileState());
        this.stateMachine.registerState('ANALYZING', new AnalyzingState());
        this.stateMachine.registerState('THINKING', new ThinkingState());
        this.stateMachine.registerState('VIEWING_PHOTOS', new ViewingPhotosState());
        this.stateMachine.registerState('DECIDING', new DecidingState());
        this.stateMachine.registerState('LIKING', new LikingState());
        this.stateMachine.registerState('NOPING', new NopingState());
        this.stateMachine.registerState('IDLE', new IdleState());
        this.stateMachine.registerState('ERROR', new ErrorState());
        this.stateMachine.registerState('SHUTDOWN', new ShutdownState());

        // Define state transitions with humanized delays
        this.stateMachine.defineTransition('WAITING_FOR_PROFILE', 'ANALYZING', {
            delay: this.randomProvider.randomInRange(50, 200) // Human reaction delay after profile loads
        });

        this.stateMachine.defineTransition('ANALYZING', 'THINKING', {
            delay: 0 // No delay, transition handled in Thinking state
        });

        this.stateMachine.defineTransition('ANALYZING', 'NOPING', {
            delay: 0 // No delay, Noping state handles quick decision timing
        });

        this.stateMachine.defineTransition('THINKING', 'VIEWING_PHOTOS', {
            delay: 0 // Thinking delay handled within Thinking state
        });

        this.stateMachine.defineTransition('VIEWING_PHOTOS', 'DECIDING', {
            delay: 0 // Photo viewing timing handled within ViewingPhotos state
        });

        this.stateMachine.defineTransition('DECIDING', 'LIKING', {
            delay: 0 // Final pause handled within Deciding state
        });

        this.stateMachine.defineTransition('LIKING', 'IDLE', {
            delay: this.randomProvider.randomInRange(800, 1200) // Brief pause after action
        });

        this.stateMachine.defineTransition('NOPING', 'IDLE', {
            delay: this.randomProvider.randomInRange(600, 1000) // Brief pause after action
        });

        this.stateMachine.defineTransition('IDLE', 'WAITING_FOR_PROFILE', {
            delay: 0 // Next profile delay handled within Idle state
        });

        // Error recovery transitions
        this.stateMachine.defineTransition('ERROR', 'WAITING_FOR_PROFILE', {
            delay: 0 // Recovery delay handled within Error state
        });

        // Any state can transition to ERROR or SHUTDOWN
        const allStates = ['WAITING_FOR_PROFILE', 'ANALYZING', 'THINKING', 'VIEWING_PHOTOS', 'DECIDING', 'LIKING', 'NOPING', 'IDLE', 'ERROR'];
        allStates.forEach(state => {
            this.stateMachine.defineTransition(state, 'ERROR', { delay: 0 });
            this.stateMachine.defineTransition(state, 'SHUTDOWN', { delay: 0 });
        });

        // Set initial state
        this.stateMachine.setInitialState('WAITING_FOR_PROFILE');

        // Set up context with shared resources
        this.stateMachine.setContext('browser', this.browser);
        this.stateMachine.setContext('hotkeys', this.hotkeys);
        this.stateMachine.setContext('randomProvider', this.randomProvider);
    }

    async start() {
        try {
            console.log('🤖 Tinder Bot Starting...');
            console.log('📝 Press CTRL+ESC to stop');

            await this.browser.initialize();
            await this.browser.waitForProfileIcon();

            // Generate behavior profile and add to context
            try {
                const behavior = new BehaviorProfile(this.randomProvider);
                behavior.logBehavior();
                this.stateMachine.setContext('behavior', behavior);
            } catch (behaviorError) {
                console.error('❌ Failed to create behavior profile:', behaviorError.message);
                console.log('🔄 Continuing without behavior profile - using fallbacks...');
                this.stateMachine.setContext('behavior', null);
            }

            this.isRunning = true;

            // Start the state machine
            await this.stateMachine.start();

        } catch (error) {
            console.error('❌ Fatal error:', error.message);
        } finally {
            await this.cleanup();
        }
    }


    async cleanup() {
        console.log('🧹 Cleaning up...');
        this.isRunning = false;

        // Stop state machine if running
        if (this.stateMachine) {
            this.stateMachine.stop();
        }

        // Cleanup is also handled by the SHUTDOWN state, but we'll do it here as backup
        await this.browser.cleanup();
        this.hotkeys.cleanup();
        console.log('✅ Cleanup complete');
    }
}

// Start the bot
const bot = new TinderBot();
bot.start();