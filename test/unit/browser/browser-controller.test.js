const BrowserController = require('../../../src/browser-controller');
const BrowserLifecycleManager = require('../../../src/browser/lifecycle-manager');
const ProfileDetector = require('../../../src/browser/profile-detector');
const UserInteractionHandler = require('../../../src/browser/user-interaction-handler');
const DialogManager = require('../../../src/browser/dialog-manager');

// Mock all dependencies
jest.mock('../../../src/browser/lifecycle-manager');
jest.mock('../../../src/browser/profile-detector');
jest.mock('../../../src/browser/user-interaction-handler');
jest.mock('../../../src/browser/dialog-manager');

describe('BrowserController', () => {
  let browserController;
  let mockLifecycleManager;
  let mockProfileDetector;
  let mockInteractionHandler;
  let mockDialogManager;
  let mockPage;

  beforeEach(() => {
    mockPage = {
      keyboard: { press: jest.fn() },
      mouse: { move: jest.fn() },
      viewportSize: jest.fn()
    };

    // Mock lifecycle manager
    mockLifecycleManager = {
      initialize: jest.fn().mockResolvedValue(),
      getPage: jest.fn().mockReturnValue(mockPage),
      isInitialized: jest.fn().mockReturnValue(true),
      cleanup: jest.fn().mockResolvedValue()
    };
    BrowserLifecycleManager.mockImplementation(() => mockLifecycleManager);

    // Mock profile detector
    mockProfileDetector = {
      checkForRecentlyActive: jest.fn(),
      waitForProfilePhoto: jest.fn(),
      waitForProfileIcon: jest.fn()
    };
    ProfileDetector.mockImplementation(() => mockProfileDetector);

    // Mock interaction handler
    mockInteractionHandler = {
      clickLikeButton: jest.fn(),
      clickNopeButton: jest.fn(),
      viewPhotos: jest.fn(),
      performMouseMovement: jest.fn()
    };
    UserInteractionHandler.mockImplementation(() => mockInteractionHandler);

    // Mock dialog manager
    mockDialogManager = {
      dismissDialogs: jest.fn()
    };
    DialogManager.mockImplementation(() => mockDialogManager);

    browserController = new BrowserController();

    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    logger.info.mockRestore();
    logger.error.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with lifecycle manager and null components', () => {
      expect(browserController.lifecycleManager).toBe(mockLifecycleManager);
      expect(browserController.profileDetector).toBeNull();
      expect(browserController.interactionHandler).toBeNull();
      expect(browserController.dialogManager).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should initialize all components successfully', async () => {
      await browserController.initialize();

      expect(mockLifecycleManager.initialize).toHaveBeenCalled();
      expect(mockLifecycleManager.getPage).toHaveBeenCalled();
      expect(ProfileDetector).toHaveBeenCalledWith(mockPage);
      expect(UserInteractionHandler).toHaveBeenCalledWith(mockPage);
      expect(DialogManager).toHaveBeenCalledWith(mockPage);
    });

    it('should throw error if page is null', async () => {
      mockLifecycleManager.getPage.mockReturnValue(null);

      await expect(browserController.initialize()).rejects.toThrow(
        'Browser initialization failed - no page available'
      );
    });

    it('should throw error if page is undefined', async () => {
      mockLifecycleManager.getPage.mockReturnValue(undefined);

      await expect(browserController.initialize()).rejects.toThrow(
        'Browser initialization failed - no page available'
      );
    });

    it('should handle lifecycle manager initialization failure', async () => {
      mockLifecycleManager.initialize.mockRejectedValue(new Error('Initialization failed'));

      await expect(browserController.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Profile detection delegation', () => {
    beforeEach(async () => {
      await browserController.initialize();
    });

    describe('checkForRecentlyActive', () => {
      it('should delegate to ProfileDetector', async () => {
        mockProfileDetector.checkForRecentlyActive.mockResolvedValue(true);

        const result = await browserController.checkForRecentlyActive();

        expect(mockProfileDetector.checkForRecentlyActive).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error if ProfileDetector not initialized', async () => {
        browserController.profileDetector = null;

        await expect(browserController.checkForRecentlyActive()).rejects.toThrow(
          'ProfileDetector not initialized'
        );
      });
    });

    describe('waitForProfilePhoto', () => {
      it('should delegate to ProfileDetector', async () => {
        mockProfileDetector.waitForProfilePhoto.mockResolvedValue(true);

        const result = await browserController.waitForProfilePhoto();

        expect(mockProfileDetector.waitForProfilePhoto).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error if ProfileDetector not initialized', async () => {
        browserController.profileDetector = null;

        await expect(browserController.waitForProfilePhoto()).rejects.toThrow(
          'ProfileDetector not initialized'
        );
      });
    });

    describe('waitForProfileIcon', () => {
      it('should delegate to ProfileDetector', async () => {
        mockProfileDetector.waitForProfileIcon.mockResolvedValue(true);

        const result = await browserController.waitForProfileIcon();

        expect(mockProfileDetector.waitForProfileIcon).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error if ProfileDetector not initialized', async () => {
        browserController.profileDetector = null;

        await expect(browserController.waitForProfileIcon()).rejects.toThrow(
          'ProfileDetector not initialized'
        );
      });
    });
  });

  describe('User interaction delegation', () => {
    beforeEach(async () => {
      await browserController.initialize();
    });

    describe('clickLikeButton', () => {
      it('should delegate to UserInteractionHandler', async () => {
        mockInteractionHandler.clickLikeButton.mockResolvedValue(true);

        const result = await browserController.clickLikeButton();

        expect(mockInteractionHandler.clickLikeButton).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error if UserInteractionHandler not initialized', async () => {
        browserController.interactionHandler = null;

        await expect(browserController.clickLikeButton()).rejects.toThrow(
          'UserInteractionHandler not initialized'
        );
      });
    });

    describe('clickNopeButton', () => {
      it('should delegate to UserInteractionHandler', async () => {
        mockInteractionHandler.clickNopeButton.mockResolvedValue(true);

        const result = await browserController.clickNopeButton();

        expect(mockInteractionHandler.clickNopeButton).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error if UserInteractionHandler not initialized', async () => {
        browserController.interactionHandler = null;

        await expect(browserController.clickNopeButton()).rejects.toThrow(
          'UserInteractionHandler not initialized'
        );
      });
    });

    describe('viewPhotos', () => {
      it('should delegate to UserInteractionHandler with behavior', async () => {
        const mockBehavior = { photoViewing: { count: 2, delays: [1000, 1500] } };
        mockInteractionHandler.viewPhotos.mockResolvedValue(true);

        const result = await browserController.viewPhotos(mockBehavior);

        expect(mockInteractionHandler.viewPhotos).toHaveBeenCalledWith(mockBehavior);
        expect(result).toBe(true);
      });

      it('should throw error if UserInteractionHandler not initialized', async () => {
        browserController.interactionHandler = null;

        await expect(browserController.viewPhotos({})).rejects.toThrow(
          'UserInteractionHandler not initialized'
        );
      });
    });

    describe('performMouseMovement', () => {
      it('should delegate to UserInteractionHandler with behavior', async () => {
        const mockBehavior = { mouseMovement: { shouldMove: true, duration: 1000, steps: 10 } };
        mockInteractionHandler.performMouseMovement.mockResolvedValue(true);

        const result = await browserController.performMouseMovement(mockBehavior);

        expect(mockInteractionHandler.performMouseMovement).toHaveBeenCalledWith(mockBehavior);
        expect(result).toBe(true);
      });

      it('should throw error if UserInteractionHandler not initialized', async () => {
        browserController.interactionHandler = null;

        await expect(browserController.performMouseMovement({})).rejects.toThrow(
          'UserInteractionHandler not initialized'
        );
      });
    });
  });

  describe('Dialog management delegation', () => {
    beforeEach(async () => {
      await browserController.initialize();
    });

    describe('dismissDialogs', () => {
      it('should delegate to DialogManager', async () => {
        mockDialogManager.dismissDialogs.mockResolvedValue(true);

        const result = await browserController.dismissDialogs();

        expect(mockDialogManager.dismissDialogs).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it('should throw error if DialogManager not initialized', async () => {
        browserController.dialogManager = null;

        await expect(browserController.dismissDialogs()).rejects.toThrow(
          'DialogManager not initialized'
        );
      });
    });
  });

  describe('Lifecycle management delegation', () => {
    describe('cleanup', () => {
      it('should delegate to lifecycle manager', async () => {
        await browserController.cleanup();

        expect(mockLifecycleManager.cleanup).toHaveBeenCalled();
      });

      it('should handle cleanup errors gracefully', async () => {
        mockLifecycleManager.cleanup.mockRejectedValue(new Error('Cleanup failed'));

        // Should not throw error
        await expect(browserController.cleanup()).resolves.not.toThrow();
      });
    });
  });

  describe('Utility methods', () => {
    describe('getPage', () => {
      it('should delegate to lifecycle manager', () => {
        const result = browserController.getPage();

        expect(mockLifecycleManager.getPage).toHaveBeenCalled();
        expect(result).toBe(mockPage);
      });
    });

    describe('isInitialized', () => {
      it('should delegate to lifecycle manager', () => {
        const result = browserController.isInitialized();

        expect(mockLifecycleManager.isInitialized).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });

    describe('delay', () => {
      it('should resolve after specified time', async () => {
        const startTime = Date.now();
        await browserController.delay(100);
        const endTime = Date.now();

        expect(endTime - startTime).toBeGreaterThanOrEqual(90);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete initialization and method calls', async () => {
      // Initialize
      await browserController.initialize();

      // Test profile detection
      mockProfileDetector.checkForRecentlyActive.mockResolvedValue(true);
      const isActive = await browserController.checkForRecentlyActive();
      expect(isActive).toBe(true);

      // Test photo viewing
      const behavior = { photoViewing: { count: 1, delays: [1000] } };
      mockInteractionHandler.viewPhotos.mockResolvedValue(true);
      const photoResult = await browserController.viewPhotos(behavior);
      expect(photoResult).toBe(true);

      // Test like button
      mockInteractionHandler.clickLikeButton.mockResolvedValue(true);
      const likeResult = await browserController.clickLikeButton();
      expect(likeResult).toBe(true);

      // Test cleanup
      await browserController.cleanup();
      expect(mockLifecycleManager.cleanup).toHaveBeenCalled();
    });

    it('should handle errors in component methods gracefully', async () => {
      await browserController.initialize();

      // Components should handle their own errors
      mockProfileDetector.checkForRecentlyActive.mockRejectedValue(new Error('Detection failed'));

      await expect(browserController.checkForRecentlyActive()).rejects.toThrow('Detection failed');
    });

    it('should maintain proper component lifecycle', async () => {
      // Before initialization, components should be null
      expect(browserController.profileDetector).toBeNull();
      expect(browserController.interactionHandler).toBeNull();
      expect(browserController.dialogManager).toBeNull();

      // After initialization, components should be created
      await browserController.initialize();
      expect(browserController.profileDetector).toBe(mockProfileDetector);
      expect(browserController.interactionHandler).toBe(mockInteractionHandler);
      expect(browserController.dialogManager).toBe(mockDialogManager);

      // Components should receive the same page instance
      expect(ProfileDetector).toHaveBeenCalledWith(mockPage);
      expect(UserInteractionHandler).toHaveBeenCalledWith(mockPage);
      expect(DialogManager).toHaveBeenCalledWith(mockPage);
    });
  });
});