import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

async function seedEpisode(request: APIRequestContext) {
  const register = await request.post(`${API_URL}/auth/register`, {
    data: { email: `suggestions-${Date.now()}@example.com`, name: 'E2E', password: 'e2e-password-123' },
  });
  expect(register.ok(), `register: ${register.status()} ${await register.text()}`).toBeTruthy();
  const { access_token: token } = await register.json() as { access_token: string };
  const headers = { Authorization: `Bearer ${token}` };
  const novel = await request.post(`${API_URL}/novels`, {
    headers, data: { title: `Suggestions ${Date.now()}`, status: 'draft' },
  });
  expect(novel.ok(), `novel: ${novel.status()} ${await novel.text()}`).toBeTruthy();
  const { id: novelId } = await novel.json() as { id: string };
  const episode = await request.post(`${API_URL}/novels/${novelId}/episodes`, {
    headers, data: { title: 'Opening', content: 'Mali found a sealed letter.', isPublished: false },
  });
  expect(episode.ok(), `episode: ${episode.status()} ${await episode.text()}`).toBeTruthy();
  const { id: episodeId } = await episode.json() as { id: string };
  return { token, novelId, episodeId };
}

async function openPanel(page: Page, seed: Awaited<ReturnType<typeof seedEpisode>>) {
  await page.addInitScript(([token]) => window.localStorage.setItem('token', token as string), [seed.token]);
  await page.goto(`/writer/novel/${seed.novelId}/episode/${seed.episodeId}`);
  await page.getByRole('button', { name: 'AI Write' }).click();
}

test('the suggestions button appears for an owned episode', async ({ page, request }) => {
  const seed = await seedEpisode(request);
  await openPanel(page, seed);
  await expect(page.getByRole('button', { name: 'ขอแนวคิด 3 แบบ' })).toBeVisible();
});

test('a suggestion fills the draft without sending it', async ({ page, request }) => {
  test.skip(process.env.E2E_AI_ENABLED !== '1', 'Needs a reachable local Ollama model');
  test.setTimeout(120_000);
  const seed = await seedEpisode(request);
  const model = await request.post(`${API_URL}/user-models`, {
    headers: { Authorization: `Bearer ${seed.token}` },
    data: {
      label: 'E2E local model', provider: 'ollama',
      modelName: process.env.E2E_MODEL_NAME ?? 'my-novel-model',
      baseUrl: process.env.E2E_OLLAMA_URL ?? 'http://localhost:11434',
      isDefault: true,
    },
  });
  expect(model.ok(), `model: ${model.status()} ${await model.text()}`).toBeTruthy();
  await openPanel(page, seed);
  const generationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/story-generations/stream')) generationRequests.push(request.url());
  });
  await page.getByRole('button', { name: 'ขอแนวคิด 3 แบบ' }).click();
  const refresh = page.getByRole('button', { name: 'Refresh storyline suggestions' });
  await expect(refresh).toBeVisible({ timeout: 90_000 });
  const chips = refresh.locator('..').locator('button[title]:not([title="Refresh"])');
  await expect(chips).toHaveCount(3);
  const prompt = await chips.first().getAttribute('title');
  await chips.first().click();
  await expect(page.locator('#ai-prompt-textarea')).toHaveValue(prompt ?? '');
  expect(generationRequests).toHaveLength(0);
});
