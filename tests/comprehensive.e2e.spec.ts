import { test, expect } from '@playwright/test';

test.describe('Vendra App - Comprehensive E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for E2E tests
    test.setTimeout(60000);
  });

  test('complete user journey - property browsing and interaction', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Check page title and main heading
    await expect(page).toHaveTitle(/Vendra/);
    await expect(page.getByRole('heading', { name: 'Welcome to Vendra' })).toBeVisible();

    // Navigate to properties page
    await page.goto('/properties');

    // Wait for properties to load
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 10000 });

    // Check that properties are displayed
    const propertyCards = page.locator('[data-testid="property-card"]');
    await expect(propertyCards.first()).toBeVisible();

    // Test property card interactions
    const firstProperty = propertyCards.first();

    // Check property has image, title, and price
    await expect(firstProperty.locator('img')).toBeVisible();
    await expect(firstProperty.locator('[data-testid="property-title"]')).toBeVisible();
    await expect(firstProperty.locator('[data-testid="property-price"]')).toBeVisible();

    // Test property detail navigation
    const viewDetailsButton = firstProperty.locator('text=Ver detalles');
    await expect(viewDetailsButton).toBeVisible();

    // Click to view property details
    await viewDetailsButton.click();

    // Should navigate to property detail page
    await expect(page).toHaveURL(/\/properties\/[a-f0-9-]+/);

    // Check property detail page elements
    await expect(page.locator('[data-testid="property-detail-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-detail-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="property-detail-description"]')).toBeVisible();
  });

  test('search functionality works correctly', async ({ page }) => {
    await page.goto('/search');

    // Check search page loads
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();

    // Test search input
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('apartamento');

    // Submit search
    await page.locator('[data-testid="search-submit"]').click();

    // Wait for results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });

    // Check results are displayed
    const results = page.locator('[data-testid="search-result-item"]');
    await expect(results.first()).toBeVisible();
  });

  test('user authentication flow', async ({ page }) => {
    // Test login page
    await page.goto('/login');

    // Check login form elements
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();

    // Test form validation
    await page.locator('[data-testid="login-submit"]').click();

    // Should show validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();

    // Test signup page
    await page.goto('/signup');

    // Check signup form elements
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="role-select"]')).toBeVisible();
  });

  test('dashboard functionality for authenticated users', async ({ page, context }) => {
    // Mock authentication by setting localStorage
    await context.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-jwt-token');
    });

    await page.goto('/dashboard');

    // Check dashboard loads
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();

    // Check stats are displayed
    await expect(page.locator('[data-testid="active-properties-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-views-count"]')).toBeVisible();

    // Test navigation between dashboard sections
    await page.locator('[data-testid="properties-tab"]').click();
    await expect(page.locator('[data-testid="properties-list"]')).toBeVisible();

    await page.locator('[data-testid="messages-tab"]').click();
    await expect(page.locator('[data-testid="messages-list"]')).toBeVisible();
  });

  test('responsive design works correctly', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check mobile navigation is visible
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Check tablet layout
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Check desktop layout
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
  });

  test('accessibility features work correctly', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);

    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // Check for proper form labels
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const label = page.locator(`label[for="${id}"]`);

      // Either has associated label or aria-label
      const hasLabel = await label.count() > 0;
      const hasAriaLabel = (await input.getAttribute('aria-label')) !== null;

      expect(hasLabel || hasAriaLabel).toBe(true);
    }

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('error handling and recovery', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');

    await expect(page.locator('[data-testid="404-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="back-home-button"]')).toBeVisible();

    // Test error boundary
    await page.goto('/properties');

    // Simulate a JavaScript error (this would need to be implemented in the app)
    await page.evaluate(() => {
      // This would trigger an error boundary in a real scenario
      throw new Error('Test error');
    });

    // Check error boundary is displayed
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('performance metrics', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

    // Check for performance issues
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation');
    });

    if (performanceEntries.length > 0) {
      const navigation = performanceEntries[0] as any;
      expect(navigation.loadEventEnd - navigation.fetchStart).toBeLessThan(3000);
    }

    // Check bundle size (approximate)
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('.js'))
        .reduce((total, entry: any) => total + entry.transferSize, 0);
    });

    // Bundle should be reasonable size (less than 5MB)
    expect(resources).toBeLessThan(5 * 1024 * 1024);
  });
});