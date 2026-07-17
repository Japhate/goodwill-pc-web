import { test, expect } from '@playwright/test';

test('a used admin invitation shows a notice without the setup form', async ({ page }) => {
  await page.route('**/api/admin/setup-invitation?token=used-invitation-token', async (route) => {
    await route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'invitation_used',
        error: 'This invitation link has already been used. Your administrator account is already set up. You can sign in with the password you created.',
        email: 'admin@example.com',
        contactEmail: 'developer@example.com',
      }),
    });
  });

  await page.goto('/AdminSetup?token=used-invitation-token');

  await expect(page.getByRole('heading', { name: 'Invitation Already Used' })).toBeVisible();
  await expect(page.getByText('Your administrator account is already set up.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Go to Admin Sign In' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Contact the Site Developer' })).toHaveAttribute('href', /mailto:developer@example\.com/);
  await expect(page.getByRole('button', { name: 'Create Password and Request Approval' })).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('input')).toHaveCount(0);
});

test('an expired invitation offers recovery without showing the setup form', async ({ page }) => {
  await page.route('**/api/admin/setup-invitation?token=expired-invitation-token', async (route) => {
    await route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'invitation_expired',
        error: 'This invitation link has expired. Please ask the Site Developer to send a new invitation.',
        email: 'admin@example.com',
        contactEmail: 'developer@example.com',
      }),
    });
  });

  await page.goto('/AdminSetup?token=expired-invitation-token');

  await expect(page.getByRole('heading', { name: 'Invitation Expired' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Request a New Invitation' })).toHaveAttribute('href', /mailto:developer@example\.com/);
  await expect(page.getByRole('button', { name: 'Go to Admin Sign In' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
});

test('a replaced invitation directs the user to the newest invitation', async ({ page }) => {
  await page.route('**/api/admin/setup-invitation?token=replaced-invitation-token', async (route) => {
    await route.fulfill({
      status: 410,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'invitation_replaced',
        error: 'A newer administrator invitation was sent to you. Please use the setup link in the most recent invitation email.',
        email: 'admin@example.com',
        contactEmail: 'developer@example.com',
      }),
    });
  });

  await page.goto('/AdminSetup?token=replaced-invitation-token');

  await expect(page.getByRole('heading', { name: 'Use Your Newest Invitation' })).toBeVisible();
  await expect(page.getByText('Check your inbox and spam folder')).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
});

test('a temporary verification error can be retried into the setup form', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/admin/setup-invitation?token=retry-invitation-token', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.abort('failed');
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'admin@example.com',
        role: 'site_admin',
        roleLabel: 'Site Admin',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    });
  });

  await page.goto('/AdminSetup?token=retry-invitation-token');
  await expect(page.getByRole('heading', { name: 'Unable to Verify Invitation' })).toBeVisible();

  await page.getByRole('button', { name: 'Try Again' }).click();

  await expect(page.getByRole('heading', { name: 'Create Your New Admin Password' })).toBeVisible();
  await expect(page.locator('form')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create Password and Request Approval' })).toBeVisible();
});

test('a completed setup consumes the link and waits for developer approval', async ({ page }) => {
  await page.route('**/api/admin/setup-invitation?token=approval-invitation-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'admin@example.com',
        role: 'site_admin',
        roleLabel: 'Site Admin',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    });
  });
  await page.route('**/api/admin/complete-invitation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, requiresApproval: true, email: 'admin@example.com' }),
    });
  });

  await page.goto('/AdminSetup?token=approval-invitation-token');
  await page.getByLabel('First Name').fill('Grace');
  await page.getByLabel('Last Name').fill('Example');
  await page.getByLabel(/^New Password/).fill('Aa1!aa');
  await page.getByLabel(/^Confirm New Password/).fill('Aa1!aa');
  await page.getByRole('button', { name: 'Create Password and Request Approval' }).click();

  await expect(page.getByRole('heading', { name: 'Waiting for Developer Approval' })).toBeVisible();
  await expect(page.getByText('one-time invitation is now consumed')).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
});

test('a wrong recipient can permanently decline and report an invitation', async ({ page }) => {
  await page.route('**/api/admin/setup-invitation?token=decline-invitation-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'wrong-recipient@example.com',
        role: 'site_admin',
        roleLabel: 'Site Admin',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    });
  });
  await page.route('**/api/admin/decline-invitation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, code: 'invitation_declined' }),
    });
  });

  await page.goto('/AdminSetup?token=decline-invitation-token&action=decline');

  await expect(page).toHaveURL(/\/adminsetup$/i);
  await expect(page.getByRole('heading', { name: 'Decline This Invitation?' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await page.getByRole('button', { name: 'Decline and Report Wrong Recipient' }).click();
  await expect(page.getByRole('heading', { name: 'Invitation Declined' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('permanently disabled');
});
