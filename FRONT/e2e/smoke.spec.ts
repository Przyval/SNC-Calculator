import { test, expect } from '@playwright/test';

/**
 * SNC Calculator - Smoke Tests
 * 
 * These tests verify that critical user flows work correctly:
 * 1. Login page loads
 * 2. User can login with valid credentials
 * 3. Dashboard loads after login
 */

test.describe('Smoke Tests', () => {

    test('should load login page', async ({ page }) => {
        await page.goto('/login');

        // Verify login page elements
        await expect(page).toHaveTitle(/Kalkulator Risiko Rayap/);
        await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /masuk|login/i })).toBeVisible();
    });

    test('should redirect to login when accessing protected route', async ({ page }) => {
        await page.goto('/');

        // Should be redirected to login or show login UI
        await expect(page).toHaveURL(/login/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in invalid credentials
        await page.getByLabel(/email/i).fill('invalid@test.com');
        await page.getByLabel(/password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /masuk|login/i }).click();

        // Should show error message
        await expect(page.getByText(/invalid|salah|gagal|error/i)).toBeVisible({ timeout: 10000 });
    });

});

test.describe('Login Flow', () => {

    test('should login successfully with valid credentials', async ({ page }) => {
        await page.goto('/login');

        // Fill in valid credentials
        await page.getByLabel(/email/i).fill('agent@snc.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /masuk|login/i }).click();

        // Wait for navigation after successful login
        await page.waitForURL('/', { timeout: 15000 });

        // Should be on dashboard/home page (not login)
        await expect(page).not.toHaveURL(/login/);
    });

});

test.describe('Navigation', () => {

    test.beforeEach(async ({ page }) => {
        // Login before each navigation test
        await page.goto('/login');
        await page.getByLabel(/email/i).fill('agent@snc.com');
        await page.getByLabel(/password/i).fill('password');
        await page.getByRole('button', { name: /masuk|login/i }).click();
        await page.waitForURL('/');
    });

    test('should display main calculator interface', async ({ page }) => {
        // Verify main calculator elements are present
        await expect(page.getByText(/risiko|rayap|kalkulator/i)).toBeVisible();
    });

});
