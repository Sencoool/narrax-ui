import { expect, test } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZkAAAAASUVORK5CYII=', 'base64');

test('the board shows a protected avatar and reveals future characters on request', async ({ page, request }) => {
  const register = await request.post(`${API_URL}/auth/register`, {
    data: { email: `board-${Date.now()}@example.com`, name: 'Board E2E', password: 'e2e-password-123' },
  });
  expect(register.ok(), `register: ${register.status()} ${await register.text()}`).toBeTruthy();
  const { access_token: token } = await register.json() as { access_token: string };
  const headers = { Authorization: `Bearer ${token}` };

  const novel = await request.post(`${API_URL}/novels`, {
    headers, data: { title: `Board E2E ${Date.now()}`, status: 'draft' },
  });
  expect(novel.ok(), `novel: ${novel.status()} ${await novel.text()}`).toBeTruthy();
  const { id: novelId } = await novel.json() as { id: string };

  const episode = await request.post(`${API_URL}/novels/${novelId}/episodes`, {
    headers, data: { title: 'Opening', content: 'A lamp on the pier.', isPublished: false },
  });
  expect(episode.ok(), `episode: ${episode.status()} ${await episode.text()}`).toBeTruthy();
  const { id: episodeId } = await episode.json() as { id: string };

  const visibleName = `Avatar ${Date.now()}`;
  const visible = await request.post(`${API_URL}/novels/${novelId}/characters`, {
    headers, data: { name: visibleName, factionIds: [] },
  });
  expect(visible.ok(), `character: ${visible.status()} ${await visible.text()}`).toBeTruthy();
  const { id: characterId } = await visible.json() as { id: string };

  const upload = await request.post(`${API_URL}/novels/${novelId}/characters/${characterId}/image`, {
    headers, multipart: { file: { name: 'avatar.png', mimeType: 'image/png', buffer: PNG } },
  });
  expect(upload.ok(), `image: ${upload.status()} ${await upload.text()}`).toBeTruthy();

  const futureName = `Future ${Date.now()}`;
  const future = await request.post(`${API_URL}/novels/${novelId}/characters`, {
    headers, data: { name: futureName, introducedAtOrder: 2, factionIds: [] },
  });
  expect(future.ok(), `future character: ${future.status()} ${await future.text()}`).toBeTruthy();

  await page.addInitScript(([value]) => window.localStorage.setItem('token', value as string), [token]);
  await page.goto(`/writer/novel/${novelId}/board`);
  await expect(page.getByRole('heading', { name: 'Character Board' })).toBeVisible();
  const avatarCard = page.locator('button.card').filter({ hasText: visibleName });
  await expect(avatarCard).toBeVisible();
  await expect(avatarCard.locator('img')).toBeVisible();
  await expect.poll(() => avatarCard.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('button.card').filter({ hasText: futureName })).toHaveCount(0);
  await page.getByRole('checkbox').check();
  await expect(page.locator('button.card').filter({ hasText: futureName })).toBeVisible();

  await page.goto(`/writer/novel/${novelId}/episode/${episodeId}`);
  await page.getByRole('button', { name: 'Context', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Novel Context' });
  await expect(drawer).toContainText(visibleName);
  await expect(drawer.locator('img')).toBeVisible();
  await expect.poll(() => drawer.locator('img').first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});
