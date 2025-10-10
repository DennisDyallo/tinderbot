# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated Tinder bot built with Playwright that simulates human-like behavior for profile interactions. The bot automatically swipes on profiles based on "Recently Active" status with sophisticated behavioral modeling to avoid detection.

## Key Commands

**Running the bot:**
```bash
npm start
# or directly
node src/index.js
```

**Installing dependencies:**
```bash
npm install
```

**Running tests:**
```bash
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage report
npm run test:unit         # Run only unit tests
npm run test:states       # Run only state tests
```

**Stopping the bot:**
- Use CTRL+ESC hotkey while bot is running
- Or kill the process manually

## Architecture

The application follows a modular class-based architecture with clear separation of concerns:

### Core Components

1. **TinderBot (`src/index.js`)** - Main orchestrator class
   - Manages overall bot lifecycle and main interaction loop
   - Coordinates between browser, hotkey handler, and behavior profiles
   - Implements the core decision logic: check "Recently Active" → view photos (if active) → swipe

2. **BrowserController (`src/browser-controller.js`)** - Playwright browser management
   - Handles persistent browser context to maintain login sessions across restarts
   - Implements anti-detection measures (user agent, stealth mode)
   - Manages all page interactions (keyboard presses, mouse movements, element detection)
   - Gracefully falls back to regular browser if persistent context fails

3. **BehaviorProfile (`src/behavior-profile.js`)** - Human behavior simulation
   - Generates personality-driven timing profiles (impatient/normal/careful users)
   - Centralizes all randomization logic to ensure consistent behavioral patterns
   - Controls photo viewing count, delays, mouse movement patterns, and decision timing

4. **HotkeyHandler (`src/hotkey-handler.js`)** - Global hotkey management
   - Monitors for CTRL+ESC shutdown command using system-level key listener
   - Provides graceful shutdown mechanism independent of browser focus

5. **Logger (`src/logger.js`)** - Centralized logging system
   - Singleton logger instance with configurable log levels (error, warn, info, debug)
   - Timestamps all log messages for debugging
   - Must be required in any file that uses logging: `require('./logger')` or `require('../logger')`
   - Exposes globally as `logger` after requiring

### User Flow Logic

The bot follows this precise sequence for each profile:

1. **Check "Recently Active" status first** (no delays)
2. **If NOT recently active**: Quick nope (300-800ms delay)
3. **If recently active**:
   - Wait/think (1-5s based on personality)
   - View photos using spacebar (1-3 times with random delays)
   - Optional smooth mouse movements during photo viewing
   - Final pause (~300ms)
   - Send like (right arrow key)
4. **Wait for next profile** (3-10s based on personality)

### Browser Session Management

- Uses `launchPersistentContext()` to maintain login state between runs
- Stores browser data in `./browser-data/` directory
- Automatically detects existing Tinder tabs and reuses them
- Falls back to regular browser launch if persistent context fails
- No re-login required on subsequent runs

### Anti-Detection Features

- **Persistent sessions**: Maintains natural browser state
- **Behavioral profiles**: Different personality types with consistent timing
- **Smooth mouse movements**: Multi-step interpolated movements (1.3-2.1s duration)
- **Randomized timing**: All delays and counts are personality-driven
- **Keyboard simulation**: Uses arrow keys and spacebar like a real user
- **User agent spoofing**: Appears as regular Chrome browser

## Key Implementation Details

### Error Handling
- Comprehensive null checks for behavior profiles with fallback to simple timing
- Graceful degradation if any component fails
- Screenshot debugging capabilities for troubleshooting selector issues
- All errors are logged through the centralized logger for consistent debugging

### Testing
- Comprehensive unit test suite with 248+ tests covering all components
- Tests use Jest framework with mock implementations
- State machine, browser controller, and all state classes have full test coverage
- Run `npm test` before committing to ensure no regressions

### Selector Strategy
- Multiple fallback selectors for "Recently Active" detection
- Robust profile icon detection for login verification
- Handles dynamic Tinder UI changes

### Browser Data Persistence
- Browser data persists in `./browser-data/` directory
- Maintains cookies, local storage, and session state
- Can be deleted to force fresh login

## Development Patterns

When modifying this codebase:

1. **Timing changes**: Always update `BehaviorProfile` class rather than hardcoding delays
2. **New interactions**: Add to `BrowserController` with proper error handling and fallbacks
3. **Behavioral changes**: Consider impact on all three personality types (impatient/normal/careful)
4. **Selector updates**: Always provide multiple fallback selectors for UI elements
5. **Error handling**: Implement graceful fallbacks that allow the bot to continue operation
6. **Logger usage**: Always add `require('./logger')` or `require('../logger')` at the top of any file that uses logger methods (logger.info, logger.error, etc.). The logger is globally available after requiring.
7. **Testing**: Run tests before committing changes. All source files should have corresponding unit tests. When adding logger calls to source files, remember that logger outputs to console with a timestamp prefix.

## Security Considerations

This bot is for educational/personal use only. It implements defensive measures to avoid detection but should be used responsibly and in compliance with Tinder's terms of service.