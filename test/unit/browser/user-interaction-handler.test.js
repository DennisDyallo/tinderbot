const UserInteractionHandler = require('../../../src/browser/user-interaction-handler');

describe('UserInteractionHandler', () => {
  let handler;
  let mockPage;

  beforeEach(() => {
    mockPage = {
      keyboard: {
        press: jest.fn().mockResolvedValue()
      },
      mouse: {
        move: jest.fn().mockResolvedValue()
      },
      viewportSize: jest.fn().mockReturnValue({ width: 1200, height: 800 })
    };

    handler = new UserInteractionHandler(mockPage);

    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    logger.log.mockRestore();
    logger.error.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with page object', () => {
      expect(handler.page).toBe(mockPage);
    });

    it('should handle null page gracefully', () => {
      const nullHandler = new UserInteractionHandler(null);
      expect(nullHandler.page).toBeNull();
    });

    it('should handle undefined page gracefully', () => {
      const undefinedHandler = new UserInteractionHandler(undefined);
      expect(undefinedHandler.page).toBeUndefined();
    });
  });

  describe('clickLikeButton', () => {
    it('should press right arrow key successfully', async () => {
      const result = await handler.clickLikeButton();

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('ArrowRight');
      expect(result).toBe(true);
    });

    it('should handle keyboard error and return false', async () => {
      mockPage.keyboard.press.mockRejectedValue(new Error('Keyboard error'));

      const result = await handler.clickLikeButton();

      expect(result).toBe(false);
    });

    it('should handle null page gracefully', async () => {
      handler.page = null;

      const result = await handler.clickLikeButton();

      expect(result).toBe(false);
    });
  });

  describe('clickNopeButton', () => {
    it('should press left arrow key successfully', async () => {
      const result = await handler.clickNopeButton();

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('ArrowLeft');
      expect(result).toBe(true);
    });

    it('should handle keyboard error and return false', async () => {
      mockPage.keyboard.press.mockRejectedValue(new Error('Keyboard error'));

      const result = await handler.clickNopeButton();

      expect(result).toBe(false);
    });
  });

  describe('viewPhotos', () => {
    it('should return true if no behavior provided', async () => {
      const result = await handler.viewPhotos(null);
      expect(result).toBe(true);
    });

    it('should return true if no photoViewing in behavior', async () => {
      const behavior = {};
      const result = await handler.viewPhotos(behavior);
      expect(result).toBe(true);
    });

    it('should skip photo viewing if count is 0', async () => {
      const behavior = {
        photoViewing: { count: 0, delays: [] }
      };

      const result = await handler.viewPhotos(behavior);

      expect(result).toBe(true);
      expect(mockPage.keyboard.press).not.toHaveBeenCalled();
    });

    it('should view photos successfully with correct delays', async () => {
      const behavior = {
        photoViewing: { count: 2, delays: [1000, 1500] }
      };

      // Mock the delay method
      handler.delay = jest.fn().mockResolvedValue();

      const result = await handler.viewPhotos(behavior);

      expect(mockPage.keyboard.press).toHaveBeenCalledTimes(2);
      expect(mockPage.keyboard.press).toHaveBeenNthCalledWith(1, 'Space');
      expect(mockPage.keyboard.press).toHaveBeenNthCalledWith(2, 'Space');
      expect(handler.delay).toHaveBeenCalledWith(1000);
      expect(handler.delay).toHaveBeenCalledWith(1500);
      expect(result).toBe(true);
    });

    it('should handle more photos than delays gracefully', async () => {
      const behavior = {
        photoViewing: { count: 3, delays: [1000] }
      };

      handler.delay = jest.fn().mockResolvedValue();

      const result = await handler.viewPhotos(behavior);

      expect(mockPage.keyboard.press).toHaveBeenCalledTimes(3);
      expect(handler.delay).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should handle keyboard error during photo viewing', async () => {
      const behavior = {
        photoViewing: { count: 1, delays: [1000] }
      };

      mockPage.keyboard.press.mockRejectedValue(new Error('Keyboard failed'));

      const result = await handler.viewPhotos(behavior);

      expect(result).toBe(false);
    });

    it('should handle null page during photo viewing', async () => {
      const behavior = {
        photoViewing: { count: 1, delays: [1000] }
      };

      handler.page = null;

      const result = await handler.viewPhotos(behavior);

      expect(result).toBe(false);
    });
  });

  describe('performMouseMovement', () => {
    it('should return true if no behavior provided', async () => {
      const result = await handler.performMouseMovement(null);
      expect(result).toBe(true);
    });

    it('should return true if mouseMovement not in behavior', async () => {
      const behavior = {};
      const result = await handler.performMouseMovement(behavior);
      expect(result).toBe(true);
    });

    it('should return true if shouldMove is false', async () => {
      const behavior = {
        mouseMovement: { shouldMove: false, duration: 1000, steps: 10 }
      };

      const result = await handler.performMouseMovement(behavior);
      expect(result).toBe(true);
    });

    it('should perform mouse movement successfully', async () => {
      const behavior = {
        mouseMovement: { shouldMove: true, duration: 1000, steps: 5 }
      };

      handler.delay = jest.fn().mockResolvedValue();

      const result = await handler.performMouseMovement(behavior);

      expect(mockPage.viewportSize).toHaveBeenCalled();
      expect(mockPage.mouse.move).toHaveBeenCalled();
      expect(handler.delay).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle viewport size failure with fallback', async () => {
      const behavior = {
        mouseMovement: { shouldMove: true, duration: 1000, steps: 5 }
      };

      mockPage.viewportSize.mockReturnValue(null);
      handler.delay = jest.fn().mockResolvedValue();

      const result = await handler.performMouseMovement(behavior);

      expect(result).toBe(true);
      expect(mockPage.mouse.move).toHaveBeenCalled();
    });

    it('should handle mouse movement error', async () => {
      const behavior = {
        mouseMovement: { shouldMove: true, duration: 1000, steps: 5 }
      };

      mockPage.mouse.move.mockRejectedValue(new Error('Mouse failed'));

      const result = await handler.performMouseMovement(behavior);

      expect(result).toBe(false);
    });

    it('should handle null page during mouse movement', async () => {
      const behavior = {
        mouseMovement: { shouldMove: true, duration: 1000, steps: 5 }
      };

      handler.page = null;

      const result = await handler.performMouseMovement(behavior);

      expect(result).toBe(false);
    });
  });

  describe('delay', () => {
    it('should resolve after specified time', async () => {
      const startTime = Date.now();
      await handler.delay(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90);
    });
  });
});