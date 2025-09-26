# Tinder Bot State Machine Tests

This directory contains comprehensive unit tests for the Tinder bot's state machine architecture.

## Test Structure

```
test/
├── unit/
│   ├── state-machine.test.js      # Core state machine functionality
│   ├── base-state.test.js         # Base state class tests
│   └── states/
│       ├── waiting-for-profile.test.js  # Profile loading state
│       ├── analyzing.test.js             # Recently Active analysis
│       ├── thinking.test.js              # Human thinking simulation
│       └── action-states.test.js         # Like/Nope/Deciding states
├── helpers/
│   └── test-utils.js              # Mock classes and test utilities
├── setup.js                      # Jest configuration and global setup
└── README.md                     # This file
```

## Running Tests

### Install Jest (if not already installed)
```bash
npm install --save-dev jest
```

### Run all tests
```bash
npm test
```

### Run with coverage
```bash
npm run test:coverage
```

### Run in watch mode (for development)
```bash
npm run test:watch
```

### Run specific test suites
```bash
# Run only unit tests
npm run test:unit

# Run only state tests
npm run test:states

# Run with verbose output
npm run test:verbose
```

## Test Coverage

The test suite covers:

### StateMachine Core (`state-machine.test.js`)
- ✅ State registration and management
- ✅ Transition definitions and validation
- ✅ Context management
- ✅ State machine lifecycle (start/stop)
- ✅ Error handling and recovery
- ✅ Transition delays and timing

### BaseState (`base-state.test.js`)
- ✅ State lifecycle methods (onEnter/onExit/execute)
- ✅ Context access and management
- ✅ Helper methods (getBrowser, getHotkeys, getBehavior)
- ✅ Timing utilities (delay, getHumanizedDelay)
- ✅ Exit request handling

### Individual States
- ✅ **WaitingForProfile**: Profile photo detection, timing, error handling
- ✅ **Analyzing**: Recently Active detection, decision logic
- ✅ **Thinking**: Behavior profile delays, fallback timing
- ✅ **Deciding**: Final pause timing
- ✅ **Liking**: Like action with nope fallback
- ✅ **Noping**: Quick decision delays, regular nope timing
- ✅ **ViewingPhotos**: Photo browsing, mouse movements (via action-states.test.js)
- ✅ **Idle**: Next profile delays
- ✅ **Error**: Recovery logic, retry mechanisms
- ✅ **Shutdown**: Cleanup procedures

## Mock Architecture

### Test Utilities (`test-utils.js`)
The test suite includes comprehensive mock classes:

- **MockStateMachine**: Simulates state machine behavior
- **MockBrowserController**: Mocks all browser interactions
- **MockBehaviorProfile**: Provides configurable behavior patterns
- **MockHotkeyHandler**: Simulates exit requests
- **TestHelpers**: Utility functions for common test operations

### Mock Features
- **Configurable Results**: Set return values for async operations
- **Call Tracking**: Monitor which methods were called and with what parameters
- **Error Simulation**: Test error handling paths
- **Timing Control**: Mock delays and timing for fast test execution

## Test Philosophy

### Comprehensive Coverage
- **Happy Path**: Normal operation flows
- **Error Paths**: Network failures, timeout scenarios, browser errors
- **Edge Cases**: No behavior profile, missing context, shutdown scenarios
- **Integration**: State transitions and data flow

### Isolation
- Each state is tested in isolation using mocks
- No real browser automation during testing
- Fast execution (tests run in milliseconds, not seconds)

### Realistic Scenarios
- Tests simulate real-world timing and delays
- Error conditions match actual runtime scenarios
- State transitions mirror production behavior

## Writing New Tests

### For New States
1. Create test file in `test/unit/states/`
2. Use mock utilities from `test-utils.js`
3. Test all execution paths (success, error, shutdown)
4. Verify state transitions and data passing
5. Test timing behavior and delays

### Test Template
```javascript
const YourState = require('../../../src/states/your-state');
const { TestHelpers } = require('../../helpers/test-utils');

describe('YourState', () => {
    let state;
    let mockStateMachine;

    beforeEach(() => {
        state = new YourState();
        mockStateMachine = TestHelpers.createMockStateMachine();
        state.setStateMachine(mockStateMachine);
    });

    describe('execute', () => {
        it('should handle normal execution', async () => {
            const result = await state.execute();
            TestHelpers.assertStateTransition(result, 'NEXT_STATE');
        });

        it('should handle shutdown request', async () => {
            mockStateMachine.context.hotkeys.requestExit();
            const result = await state.execute();
            TestHelpers.assertStateTransition(result, 'SHUTDOWN');
        });
    });
});
```

## Debugging Tests

### Verbose Output
```bash
npm run test:verbose
```

### Single Test File
```bash
npx jest test/unit/states/analyzing.test.js
```

### Debug Specific Test
```javascript
describe.only('specific test suite', () => {
    it.only('specific test case', () => {
        // Your test here
    });
});
```

## Coverage Reports

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in your browser to see detailed coverage reports.

Target coverage:
- **Statements**: > 95%
- **Branches**: > 90%
- **Functions**: > 95%
- **Lines**: > 95%