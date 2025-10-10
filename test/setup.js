// Global test setup
// Note: We don't globally mock console methods since many tests verify console output
// Individual tests can mock console if they need to suppress output

afterEach(() => {
  // Restore all mocks after each test
  jest.restoreAllMocks();
});
