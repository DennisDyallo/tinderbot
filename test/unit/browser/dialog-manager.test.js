const DialogManager = require('../../../src/browser/dialog-manager');

describe('DialogManager', () => {
  let dialogManager;
  let mockPage;

  beforeEach(() => {
    mockPage = {
      $: jest.fn(),
      $$: jest.fn(),
      waitForSelector: jest.fn()
    };

    dialogManager = new DialogManager(mockPage);

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
      expect(dialogManager.page).toBe(mockPage);
    });
  });

  describe('dismissDialogs', () => {
    it('should return true when home screen dialog is dismissed', async () => {
      dialogManager.checkAndDismissDialog = jest.fn()
        .mockResolvedValueOnce(true) // Home screen dialog found and dismissed
        .mockResolvedValueOnce(false); // Super like dialog not found

      const result = await dialogManager.dismissDialogs();

      expect(result).toBe(true);
      expect(dialogManager.checkAndDismissDialog).toHaveBeenCalledTimes(2);
    });

    it('should return true when super like dialog is dismissed', async () => {
      dialogManager.checkAndDismissDialog = jest.fn()
        .mockResolvedValueOnce(false) // Home screen dialog not found
        .mockResolvedValueOnce(true); // Super like dialog found and dismissed

      const result = await dialogManager.dismissDialogs();

      expect(result).toBe(true);
    });

    it('should return false when no dialogs are found', async () => {
      dialogManager.checkAndDismissDialog = jest.fn().mockResolvedValue(false);

      const result = await dialogManager.dismissDialogs();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      dialogManager.checkAndDismissDialog = jest.fn().mockRejectedValue(new Error('Dialog error'));

      const result = await dialogManager.dismissDialogs();

      expect(result).toBe(false);
    });
  });

  describe('checkAndDismissDialog', () => {
    let mockDialog, mockButton;

    beforeEach(() => {
      mockDialog = {
        isVisible: jest.fn()
      };

      mockButton = {
        isVisible: jest.fn(),
        click: jest.fn()
      };

      mockPage.waitForSelector.mockImplementation(() => Promise.resolve().catch(() => {}));
    });

    it('should dismiss dialog when found and visible', async () => {
      mockDialog.isVisible.mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(true);
      mockPage.$.mockResolvedValueOnce(mockDialog).mockResolvedValueOnce(mockButton);

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(true);
      expect(mockButton.click).toHaveBeenCalled();
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('div[role="dialog"]', {
        state: 'hidden',
        timeout: 3000
      });
    });

    it('should return false when dialog not found', async () => {
      mockPage.$.mockResolvedValue(null);

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(false);
      expect(mockButton.click).not.toHaveBeenCalled();
    });

    it('should return false when dialog not visible', async () => {
      mockDialog.isVisible.mockResolvedValue(false);
      mockPage.$.mockResolvedValue(mockDialog);

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(false);
      expect(mockButton.click).not.toHaveBeenCalled();
    });

    it('should return false when dismiss button not found', async () => {
      mockDialog.isVisible.mockResolvedValue(true);
      mockPage.$.mockResolvedValueOnce(mockDialog).mockResolvedValueOnce(null);

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(false);
    });

    it('should return false when dismiss button not visible', async () => {
      mockDialog.isVisible.mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(false);
      mockPage.$.mockResolvedValueOnce(mockDialog).mockResolvedValueOnce(mockButton);

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(false);
      expect(mockButton.click).not.toHaveBeenCalled();
    });

    it('should handle click errors gracefully', async () => {
      mockDialog.isVisible.mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(true);
      mockButton.click.mockRejectedValue(new Error('Click failed'));
      mockPage.$.mockResolvedValueOnce(mockDialog).mockResolvedValueOnce(mockButton);

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(false);
    });

    it('should handle selector errors gracefully', async () => {
      mockPage.$.mockRejectedValue(new Error('Selector error'));

      const result = await dialogManager.checkAndDismissDialog(
        'div[role="dialog"]',
        'button:has-text("Not interested")',
        'Test Dialog'
      );

      expect(result).toBe(false);
    });
  });

  describe('checkForSpecificDialog', () => {
    let mockDialog;

    beforeEach(() => {
      mockDialog = {
        isVisible: jest.fn(),
        textContent: 'Add Tinder to your Home Screen - Get instant access!'
      };
    });

    it('should return true when home screen dialog is found', async () => {
      mockDialog.isVisible.mockResolvedValue(true);
      mockPage.$$.mockResolvedValue([mockDialog]);

      const result = await dialogManager.checkForSpecificDialog('homeScreen');

      expect(result).toBe(true);
    });

    it('should return true when super like dialog is found', async () => {
      mockDialog.textContent = 'Upgrade Your Like to a Super Like!';
      mockDialog.isVisible.mockResolvedValue(true);
      mockPage.$$.mockResolvedValue([mockDialog]);

      const result = await dialogManager.checkForSpecificDialog('superLike');

      expect(result).toBe(true);
    });

    it('should return false for unknown dialog type', async () => {
      const result = await dialogManager.checkForSpecificDialog('unknownDialog');

      expect(result).toBe(false);
    });

    it('should return false when dialog not visible', async () => {
      mockDialog.isVisible.mockResolvedValue(false);
      mockPage.$$.mockResolvedValue([mockDialog]);

      const result = await dialogManager.checkForSpecificDialog('homeScreen');

      expect(result).toBe(false);
    });

    it('should return false when no dialogs found', async () => {
      mockPage.$$.mockResolvedValue([]);

      const result = await dialogManager.checkForSpecificDialog('homeScreen');

      expect(result).toBe(false);
    });

    it('should handle selector errors gracefully', async () => {
      mockPage.$$.mockRejectedValue(new Error('Selector error'));

      const result = await dialogManager.checkForSpecificDialog('homeScreen');

      expect(result).toBe(false);
    });
  });

  describe('dismissSpecificDialog', () => {
    let mockButton;

    beforeEach(() => {
      mockButton = {
        isVisible: jest.fn(),
        click: jest.fn()
      };
    });

    it('should dismiss home screen dialog successfully', async () => {
      dialogManager.checkForSpecificDialog = jest.fn().mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(true);
      mockPage.$.mockResolvedValue(mockButton);

      const result = await dialogManager.dismissSpecificDialog('homeScreen');

      expect(result).toBe(true);
      expect(mockButton.click).toHaveBeenCalled();
    });

    it('should dismiss super like dialog successfully', async () => {
      dialogManager.checkForSpecificDialog = jest.fn().mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(true);
      mockPage.$.mockResolvedValue(mockButton);

      const result = await dialogManager.dismissSpecificDialog('superLike');

      expect(result).toBe(true);
      expect(mockButton.click).toHaveBeenCalled();
    });

    it('should return false when dialog does not exist', async () => {
      dialogManager.checkForSpecificDialog = jest.fn().mockResolvedValue(false);

      const result = await dialogManager.dismissSpecificDialog('homeScreen');

      expect(result).toBe(false);
      expect(mockPage.$).not.toHaveBeenCalled();
    });

    it('should return false for unknown dialog type', async () => {
      const result = await dialogManager.dismissSpecificDialog('unknownDialog');

      expect(result).toBe(false);
    });

    it('should return false when dismiss button not found', async () => {
      dialogManager.checkForSpecificDialog = jest.fn().mockResolvedValue(true);
      mockPage.$.mockResolvedValue(null);

      const result = await dialogManager.dismissSpecificDialog('homeScreen');

      expect(result).toBe(false);
    });

    it('should return false when dismiss button not visible', async () => {
      dialogManager.checkForSpecificDialog = jest.fn().mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(false);
      mockPage.$.mockResolvedValue(mockButton);

      const result = await dialogManager.dismissSpecificDialog('homeScreen');

      expect(result).toBe(false);
      expect(mockButton.click).not.toHaveBeenCalled();
    });

    it('should handle click errors gracefully', async () => {
      dialogManager.checkForSpecificDialog = jest.fn().mockResolvedValue(true);
      mockButton.isVisible.mockResolvedValue(true);
      mockButton.click.mockRejectedValue(new Error('Click failed'));
      mockPage.$.mockResolvedValue(mockButton);

      const result = await dialogManager.dismissSpecificDialog('homeScreen');

      expect(result).toBe(false);
    });
  });
});