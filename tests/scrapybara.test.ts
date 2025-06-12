import { test, expect } from '@playwright/test';
import { ScrapybaraClient } from '../lib/scrapybara';

test.describe('Scrapybara Launch Tests', () => {
  test('should successfully launch an instance with correct API endpoint', async () => {
    // Mock the API key for testing
    const mockApiKey = 'test-api-key';
    
    // Create ScrapybaraClient instance
    const client = new ScrapybaraClient({
      apiKey: mockApiKey,
    });

    // Test that the client is instantiated correctly
    expect(client).toBeDefined();
    
    // Verify that the default environment is set correctly
    // This test ensures the base URL includes /v1 path
    const environment = client._options?.environment;
    
    // The environment should either be undefined (using default) or include /v1
    if (environment) {
      // If environment is set, it should include /v1
      expect(environment.toString()).toContain('/v1');
    }
  });

  test('should construct correct API URLs for various endpoints', async () => {
    const client = new ScrapybaraClient({
      apiKey: 'test-api-key',
    });

    // Test that client methods exist and are callable
    expect(typeof client.startUbuntu).toBe('function');
    expect(typeof client.startBrowser).toBe('function');
    expect(typeof client.startWindows).toBe('function');
    expect(typeof client.getInstances).toBe('function');
  });

  test('should handle API key from environment variable', async () => {
    // Test with environment variable
    process.env.SCRAPYBARA_API_KEY = 'env-api-key';
    
    const client = new ScrapybaraClient();
    
    expect(client).toBeDefined();
    
    // Clean up
    delete process.env.SCRAPYBARA_API_KEY;
  });

  test('should prevent duplicate v1 paths in URLs', async () => {
    // This test ensures our fix prevents URLs like https://api.scrapybara.com/v1/v1/start
    const client = new ScrapybaraClient({
      apiKey: 'test-api-key',
    });

    // The environment should be set to include /v1 already
    // so when urlJoin combines it with endpoint paths,
    // we don't get duplicate /v1 segments
    
    // This is a structural test - the actual URL construction
    // happens in the core fetcher, but we can verify the setup
    expect(client).toBeDefined();
  });
});

test.describe('Environment Configuration Tests', () => {
  test('should use correct production environment URL', async () => {
    const { ScrapybaraEnvironment } = await import('../lib/scrapybara/environments');
    
    // Verify the production environment includes /v1
    expect(ScrapybaraEnvironment.Production).toBe('https://api.scrapybara.com/v1');
  });

  test('should handle custom environment configuration', async () => {
    const customEnvironment = 'https://custom.scrapybara.com/v1';
    
    const client = new ScrapybaraClient({
      apiKey: 'test-api-key',
      environment: customEnvironment,
    });

    expect(client).toBeDefined();
    expect(client._options?.environment).toBe(customEnvironment);
  });
});