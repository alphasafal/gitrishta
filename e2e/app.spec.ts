import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './mock';

test('builds a biodata from the form and updates the URL', async ({ page, problems: _ }) => {
  await page.goto('/');
  await page.getByPlaceholder('username', { exact: true }).fill('pixel-pandit');
  await page.getByRole('button', { name: 'Banao Biodata' }).click();
  const card = page.locator('#card');
  await expect(card.getByRole('heading', { name: 'Biodata' })).toBeVisible();
  await expect(card).toContainText('Gotra');
  await expect(card).toContainText('TypeScript');
  await expect(page).toHaveURL(/\?u=pixel-pandit$/);
  await expect(page.locator('#x')).toHaveAttribute('href', /%2Fs%2Fpixel-pandit/);
});

test('kundli milan from a shared link, with style and Hindi', async ({ page, problems: _ }) => {
  await page.goto('/?u=pixel-pandit&m=merge-maharani');
  await expect(page.locator('.koota')).toHaveCount(5);
  await expect(page.getByRole('img', { name: /out of 36 gunas matched/ })).toBeVisible();
  await page.getByRole('button', { name: /South/ }).click();
  await page.getByRole('button', { name: /हिंदी labels/ }).click();
  await expect(page.locator('#card')).toHaveAttribute('data-theme', 'south');
  await expect(page.locator('#card .bd-title')).toHaveText('कुंडली मिलान');
  await expect(page).toHaveURL(/t=south&l=hi/);
});

test('match with a friend prefills Kundli Milan', async ({ page, problems: _ }) => {
  await page.goto('/?u=pixel-pandit');
  await page.getByRole('button', { name: /Match with a friend/ }).click();
  await expect(page.locator('#u1')).toHaveValue('pixel-pandit');
  await expect(page.locator('#u2')).toBeFocused();
});

test('downloads a PNG of the card', async ({ page, problems: _ }) => {
  await page.goto('/?u=pixel-pandit');
  await expect(page.locator('#card img.avatar')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download image/ }).click()]);
  expect(download.suggestedFilename()).toBe('gitrishta-pixel-pandit.png');
});

test('hostile profile data renders as text and loads nothing from other hosts', async ({ page, problems: _ }) => {
  await page.goto('/?u=xss-tester');
  await expect(page.locator('#card')).toContainText('<script>alert(1)</script>');
  await expect(page.locator('#card script, #card img, #card [onerror]')).toHaveCount(0);
});

test('Trusted Types blocks HTML and script injection', async ({ page }) => {
  await page.goto('/');
  const r = await page.evaluate(() => {
    const t = (f: () => void) => { try { f(); return 'allowed'; } catch { return 'blocked'; } };
    return {
      html: t(() => { document.createElement('div').innerHTML = '<b>x</b>'; }),
      script: t(() => { document.createElement('script').src = '/evil.js'; }),
      analytics: t(() => { document.createElement('script').src = '/_vercel/insights/script.js'; }),
    };
  });
  expect(r).toEqual({ html: 'blocked', script: 'blocked', analytics: 'allowed' });
});

test('friendly errors for bad input, unknown users and rate limits', async ({ page, problems: _ }) => {
  await page.goto(`/?u=${encodeURIComponent('../../repos/a/b')}`);
  await expect(page.getByRole('status')).toContainText('does not look like a GitHub username');
  await page.goto('/?u=nobody-at-all');
  await expect(page.getByRole('status')).toContainText('No rishta found');
  await page.goto('/?u=rate-limited');
  await expect(page.getByRole('status')).toContainText('Pandit ji needs a break');
});

for (const [name, path] of [['landing', '/'], ['biodata', '/?u=pixel-pandit'], ['kundli', '/?u=pixel-pandit&m=merge-maharani'], ['south + Hindi', '/?u=pixel-pandit&t=south&l=hi'], ['punjabi kundli', '/?u=pixel-pandit&m=merge-maharani&t=punjabi'], ['bengali', '/?u=pixel-pandit&t=bengali']]) {
  test(`no accessibility violations: ${name}`, async ({ page, problems: _ }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); // measure final colours, not mid-fade
    await page.goto(path!);
    if (path !== '/') await expect(page.locator('#card img.avatar').first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.length} (${v.help})`)).toEqual([]);
  });
}
