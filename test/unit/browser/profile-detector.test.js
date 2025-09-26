const ProfileDetector = require('../../../src/browser/profile-detector');

describe('ProfileDetector', () => {
  let detector;
  let mockPage;

  beforeEach(() => {
    mockPage = {
      $: jest.fn(),
      $$: jest.fn(),
      screenshot: jest.fn().mockResolvedValue()
    };

    detector = new ProfileDetector(mockPage);

    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with page object', () => {
      expect(detector.page).toBe(mockPage);
    });
  });

  describe('checkForRecentlyActive', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        isVisible: jest.fn(),
        textContent: jest.fn(),
        getAttribute: jest.fn()
      };
    });

    it('should return true when green dot is found and visible', async () => {
      mockElement.isVisible.mockResolvedValue(true);
      mockPage.$.mockResolvedValue(mockElement);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(true);
      expect(mockPage.$).toHaveBeenCalledWith('div[class*="Bgc($c-ds-background-badge-online-now-default)"]');
    });

    it('should return false when green dot is not visible', async () => {
      mockElement.isVisible.mockResolvedValue(false);
      mockPage.$.mockResolvedValue(mockElement);
      mockPage.$$.mockResolvedValue([]);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(false);
    });

    it('should return true when text-based detection finds Recently Active', async () => {
      // Green dot not found
      mockPage.$.mockResolvedValue(null);

      // Text element found
      mockElement.textContent.mockResolvedValue('Recently Active');
      mockElement.isVisible.mockResolvedValue(true);
      mockPage.$$.mockResolvedValue([mockElement]);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(true);
    });

    it('should return false when text element is not visible', async () => {
      mockPage.$.mockResolvedValue(null);
      mockElement.textContent.mockResolvedValue('Recently Active');
      mockElement.isVisible.mockResolvedValue(false);
      mockPage.$$.mockResolvedValue([mockElement]);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(false);
    });

    it('should return false when text does not contain Recently Active', async () => {
      mockPage.$.mockResolvedValue(null);
      mockElement.textContent.mockResolvedValue('Other text');
      mockElement.isVisible.mockResolvedValue(true);
      mockPage.$$.mockResolvedValue([mockElement]);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(false);
    });

    it('should handle multiple text selectors', async () => {
      mockPage.$.mockResolvedValue(null);

      // First selector returns empty array
      mockPage.$$
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockElement]);

      mockElement.textContent.mockResolvedValue('Recently Active');
      mockElement.isVisible.mockResolvedValue(true);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(true);
      expect(mockPage.$$).toHaveBeenCalledTimes(2);
    });

    it('should handle selector errors gracefully', async () => {
      mockPage.$.mockResolvedValue(null);
      mockPage.$$.mockRejectedValue(new Error('Selector error'));

      detector.takeDebugScreenshot = jest.fn();

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(false);
    });

    it('should handle element errors gracefully', async () => {
      mockPage.$.mockResolvedValue(null);
      mockElement.textContent.mockRejectedValue(new Error('Element error'));
      mockPage.$$.mockResolvedValue([mockElement]);

      const result = await detector.checkForRecentlyActive();

      expect(result).toBe(false);
    });
  });

  describe('waitForProfilePhoto', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        isVisible: jest.fn(),
        getAttribute: jest.fn()
      };

      detector.delay = jest.fn().mockResolvedValue();
    });

    it('should return true when profile photo is found', async () => {
      mockElement.isVisible.mockResolvedValue(true);
      mockElement.getAttribute.mockResolvedValue('Profile Photo 1');
      mockPage.$$.mockResolvedValue([mockElement]);

      const result = await detector.waitForProfilePhoto();

      expect(result).toBe(true);
    });

    it('should return false when profile photo is not visible', async () => {
      mockElement.isVisible.mockResolvedValue(false);
      mockElement.getAttribute.mockResolvedValue('Profile Photo 1');
      mockPage.$$.mockResolvedValue([mockElement]);

      // Mock timeout by making delay resolve immediately
      detector.delay.mockImplementation(() => {
        // Advance time to trigger timeout
        jest.advanceTimersByTime(35000);
        return Promise.resolve();
      });

      jest.useFakeTimers();
      const result = await detector.waitForProfilePhoto();
      jest.useRealTimers();

      expect(result).toBe(false);
    });

    it('should return false when no elements found', async () => {
      mockPage.$$.mockResolvedValue([]);

      detector.delay.mockImplementation(() => {
        jest.advanceTimersByTime(35000);
        return Promise.resolve();
      });

      jest.useFakeTimers();
      const result = await detector.waitForProfilePhoto();
      jest.useRealTimers();

      expect(result).toBe(false);
    });

    it('should try multiple selectors', async () => {
      mockPage.$$
        .mockResolvedValueOnce([]) // First selector fails
        .mockResolvedValueOnce([mockElement]); // Second selector succeeds

      mockElement.isVisible.mockResolvedValue(true);
      mockElement.getAttribute.mockResolvedValue('Profile Photo 1');

      const result = await detector.waitForProfilePhoto();

      expect(result).toBe(true);
    });

    it('should handle selector errors gracefully', async () => {
      mockPage.$$.mockRejectedValue(new Error('Selector error'));

      detector.delay.mockImplementation(() => {
        jest.advanceTimersByTime(35000);
        return Promise.resolve();
      });

      jest.useFakeTimers();
      const result = await detector.waitForProfilePhoto();
      jest.useRealTimers();

      expect(result).toBe(false);
    });
  });

  describe('waitForProfileIcon', () => {
    let mockElement;

    beforeEach(() => {
      mockElement = {
        isVisible: jest.fn()
      };

      detector.delay = jest.fn().mockResolvedValue();
    });

    it('should return true when profile icon is found and visible', async () => {
      mockElement.isVisible.mockResolvedValue(true);
      mockPage.$.mockResolvedValue(mockElement);

      const result = await detector.waitForProfileIcon();

      expect(result).toBe(true);
    });

    it('should return false when profile icon is not visible', async () => {
      mockElement.isVisible.mockResolvedValue(false);
      mockPage.$.mockResolvedValue(mockElement);

      detector.delay.mockImplementation(() => {
        jest.advanceTimersByTime(35000);
        return Promise.resolve();
      });

      jest.useFakeTimers();
      const result = await detector.waitForProfileIcon();
      jest.useRealTimers();

      expect(result).toBe(false);
    });

    it('should return false when no profile icon found', async () => {
      mockPage.$.mockResolvedValue(null);

      detector.delay.mockImplementation(() => {
        jest.advanceTimersByTime(35000);
        return Promise.resolve();
      });

      jest.useFakeTimers();
      const result = await detector.waitForProfileIcon();
      jest.useRealTimers();

      expect(result).toBe(false);
    });

    it('should try multiple selectors', async () => {
      mockPage.$
        .mockResolvedValueOnce(null) // First selector fails
        .mockResolvedValueOnce(mockElement); // Second selector succeeds

      mockElement.isVisible.mockResolvedValue(true);

      const result = await detector.waitForProfileIcon();

      expect(result).toBe(true);
    });
  });

  describe('takeDebugScreenshot', () => {
    it('should take screenshot successfully', async () => {
      await detector.takeDebugScreenshot('test');

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: expect.stringContaining('debug-test-'),
        fullPage: false
      });
    });

    it('should handle screenshot errors gracefully', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Screenshot failed'));

      await expect(detector.takeDebugScreenshot('test')).resolves.not.toThrow();
    });
  });

  describe('delay', () => {
    it('should resolve after specified time', async () => {
      const startTime = Date.now();
      await detector.delay(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(90);
    });
  });
});