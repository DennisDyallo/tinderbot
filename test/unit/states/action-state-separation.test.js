const LikingState = require('../../../src/states/liking');
const NopingState = require('../../../src/states/noping');
const IdleState = require('../../../src/states/idle');

describe('Action State Separation', () => {
  let mockContext;
  let mockBrowser;

  beforeEach(() => {
    mockBrowser = {
      clickLikeButton: jest.fn().mockResolvedValue(true),
      clickNopeButton: jest.fn().mockResolvedValue(true),
      waitForProfilePhoto: jest.fn().mockResolvedValue(true)
    };

    mockContext = {
      browser: mockBrowser,
      behavior: {
        onProfileCompleted: jest.fn()
      },
      transitionData: {}
    };

    // Suppress console logs for cleaner test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    logger.log.mockRestore();
    logger.error.mockRestore();
  });

  describe('LikingState', () => {
    let likingState;

    beforeEach(() => {
      likingState = new LikingState();
      likingState.setStateMachine({ getContext: () => mockContext });
    });

    it('should only handle liking action and transition to IDLE', async () => {
      const result = await likingState.execute();

      expect(mockBrowser.clickLikeButton).toHaveBeenCalled();
      expect(mockBrowser.waitForProfilePhoto).not.toHaveBeenCalled();
      expect(result.nextState).toBe('IDLE');
    });

    it('should handle like failure by transitioning to ERROR', async () => {
      mockBrowser.clickLikeButton.mockResolvedValue(false);

      const result = await likingState.execute();

      expect(result.nextState).toBe('ERROR');
      expect(result.data.error).toBeDefined();
    });

    it('should track profile completion in behavior', async () => {
      await likingState.execute();

      expect(mockContext.behavior.onProfileCompleted).toHaveBeenCalled();
    });
  });

  describe('NopingState', () => {
    let nopingState;

    beforeEach(() => {
      nopingState = new NopingState();
      nopingState.setStateMachine({ getContext: () => mockContext });
    });

    it('should only handle noping action and transition to IDLE', async () => {
      const result = await nopingState.execute();

      expect(mockBrowser.clickNopeButton).toHaveBeenCalled();
      expect(mockBrowser.waitForProfilePhoto).not.toHaveBeenCalled();
      expect(result.nextState).toBe('IDLE');
    });

    it('should handle quick decision delay for not recently active profiles', async () => {
      mockContext.transitionData = { quickDecision: true };
      mockContext.behavior = {
        onProfileCompleted: jest.fn(),
        getQuickDecisionDelay: jest.fn().mockReturnValue(500)
      };
      nopingState.delay = jest.fn().mockResolvedValue();

      const result = await nopingState.execute();

      expect(nopingState.delay).toHaveBeenCalledWith(500);
      expect(result.nextState).toBe('IDLE');
    });

    it('should handle nope failure by transitioning to ERROR', async () => {
      mockBrowser.clickNopeButton.mockResolvedValue(false);

      const result = await nopingState.execute();

      expect(result.nextState).toBe('ERROR');
      expect(result.data.error).toBeDefined();
    });

    it('should track profile completion in behavior', async () => {
      await nopingState.execute();

      expect(mockContext.behavior.onProfileCompleted).toHaveBeenCalled();
    });
  });

  describe('IdleState should handle waiting logic', () => {
    let idleState;

    beforeEach(() => {
      idleState = new IdleState();
      idleState.setStateMachine({ getContext: () => mockContext });
    });

    it('should wait for next profile and transition to WAITING_FOR_PROFILE', async () => {
      mockContext.behavior = {
        getNextProfileDelay: jest.fn().mockReturnValue(3000)
      };
      idleState.delay = jest.fn().mockResolvedValue();

      const result = await idleState.execute();

      expect(idleState.delay).toHaveBeenCalledWith(3000);
      expect(mockBrowser.waitForProfilePhoto).toHaveBeenCalled();
      expect(result.nextState).toBe('WAITING_FOR_PROFILE');
    });
  });
});