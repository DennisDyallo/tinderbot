const BrowserLifecycleManager = require('../../../src/browser/lifecycle-manager');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

jest.mock('playwright');
jest.mock('fs');
jest.mock('path');

describe('BrowserLifecycleManager', () => {
  let lifecycleManager;
  let mockContext;
  let mockPage;
  let mockBrowser;

  beforeEach(() => {
    // Mock path first, before creating the instance
    path.join = jest.fn().mockReturnValue('/mock/browser-data');

    lifecycleManager = new BrowserLifecycleManager();

    // Mock page object
    mockPage = {
      url: jest.fn().mockReturnValue('https://tinder.com/app/recs'),
      goto: jest.fn().mockResolvedValue(),
      addInitScript: jest.fn().mockResolvedValue(),
      keyboard: { press: jest.fn() },
      viewportSize: jest.fn().mockReturnValue({ width: 1200, height: 800 }),
      mouse: { move: jest.fn() }
    };

    // Mock context object
    mockContext = {
      pages: jest.fn().mockReturnValue([mockPage]),
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue()
    };

    // Mock browser object
    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn().mockResolvedValue()
    };

    // Mock chromium
    chromium.launchPersistentContext = jest.fn().mockResolvedValue(mockContext);
    chromium.launch = jest.fn().mockResolvedValue(mockBrowser);

    // Mock fs
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();


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
    it('should initialize with null values', () => {
      expect(lifecycleManager.browser).toBeNull();
      expect(lifecycleManager.context).toBeNull();
      expect(lifecycleManager.page).toBeNull();
      expect(lifecycleManager.userDataDir).toEqual('/mock/browser-data');
    });
  });

  describe('initialize', () => {
    it('should successfully launch persistent context and reuse existing page', async () => {
      await lifecycleManager.initialize();

      expect(chromium.launchPersistentContext).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headless: false,
          slowMo: 100,
          locale: 'en-US',
          timezoneId: 'Europe/Stockholm'
        })
      );

      expect(lifecycleManager.context).toBe(mockContext);
      expect(lifecycleManager.page).toBe(mockPage);
      expect(mockPage.addInitScript).toHaveBeenCalled();
    });

    it('should navigate to Tinder if not already there', async () => {
      mockPage.url.mockReturnValue('https://google.com');

      await lifecycleManager.initialize();

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://tinder.com/app/recs',
        { waitUntil: 'domcontentloaded' }
      );
    });

    it('should skip navigation if already on Tinder', async () => {
      mockPage.url.mockReturnValue('https://tinder.com/app/recs');

      await lifecycleManager.initialize();

      expect(mockPage.goto).not.toHaveBeenCalled();
    });

    it('should create new page if no existing pages', async () => {
      mockContext.pages.mockReturnValue([]);

      await lifecycleManager.initialize();

      expect(mockContext.newPage).toHaveBeenCalled();
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://tinder.com/app/recs',
        { waitUntil: 'domcontentloaded' }
      );
    });

    it('should create browser data directory if it does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await lifecycleManager.initialize();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true }
      );
    });

    it('should fallback to regular browser if persistent context fails', async () => {
      chromium.launchPersistentContext.mockRejectedValue(new Error('Persistent context failed'));

      await lifecycleManager.initialize();

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          headless: false,
          slowMo: 100
        })
      );
      expect(mockBrowser.newContext).toHaveBeenCalled();
    });

    it('should throw error if both persistent and regular browser fail', async () => {
      chromium.launchPersistentContext.mockRejectedValue(new Error('Persistent failed'));
      chromium.launch.mockRejectedValue(new Error('Regular failed'));

      await expect(lifecycleManager.initialize()).rejects.toThrow(
        'Both persistent and regular browser failed to launch'
      );
    });
  });

  describe('addAntiDetectionScript', () => {
    it('should add anti-detection script to page', async () => {
      lifecycleManager.page = mockPage;

      await lifecycleManager.addAntiDetectionScript();

      expect(mockPage.addInitScript).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('cleanup', () => {
    it('should close context and browser', async () => {
      lifecycleManager.context = mockContext;
      lifecycleManager.browser = mockBrowser;

      await lifecycleManager.cleanup();

      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      lifecycleManager.context = mockContext;
      mockContext.close.mockRejectedValue(new Error('Close failed'));

      await expect(lifecycleManager.cleanup()).resolves.not.toThrow();
    });

    it('should handle null context and browser', async () => {
      lifecycleManager.context = null;
      lifecycleManager.browser = null;

      await expect(lifecycleManager.cleanup()).resolves.not.toThrow();
    });
  });

  describe('getPage', () => {
    it('should return the current page', () => {
      lifecycleManager.page = mockPage;
      expect(lifecycleManager.getPage()).toBe(mockPage);
    });

    it('should return null if no page', () => {
      lifecycleManager.page = null;
      expect(lifecycleManager.getPage()).toBeNull();
    });
  });

  describe('isInitialized', () => {
    it('should return true if page exists', () => {
      lifecycleManager.page = mockPage;
      expect(lifecycleManager.isInitialized()).toBe(true);
    });

    it('should return false if page is null', () => {
      lifecycleManager.page = null;
      expect(lifecycleManager.isInitialized()).toBe(false);
    });
  });
});