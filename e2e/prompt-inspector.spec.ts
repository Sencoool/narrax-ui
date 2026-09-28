import { expect, test } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

test('a writer can inspect the prompt saved for their generation', async ({ page, request }) => {
  test.skip(process.env.E2E_AI_ENABLED !== '1', 'Needs a reachable local model');
  test.setTimeout(120_000);

  const register = await request.post(`${API_URL}/auth/register`, {
    data: { email: `inspector-${Date.now()}@example.com`, name: 'Inspector E2E', password: 'e2e-password-123' },
  });
  expect(register.ok(), `register: ${register.status()} ${await register.text()}`).toBeTruthy();
  const { access_token: token } = await register.json() as { access_token: string };
  const headers = { Authorization: `Bearer ${token}` };

  const novel = await request.post(`${API_URL}/novels`, {
    headers, data: { title: `Inspector E2E ${Date.now()}`, status: 'draft' },
  });
  expect(novel.ok(), `novel: ${novel.status()} ${await novel.text()}`).toBeTruthy();
  const { id: novelId } = await novel.json() as { id: string };
  const episode = await request.post(`${API_URL}/novels/${novelId}/episodes`, {
    headers, data: { title: 'Opening', content: 'The lamp was lit.', isPublished: false },
  });
  expect(episode.ok(), `episode: ${episode.status()} ${await episode.text()}`).toBeTruthy();
  const { id: episodeId } = await episode.json() as { id: string };
  const model = await request.post(`${API_URL}/user-models`, {
    headers, data: { label: 'Inspector local model', provider: 'ollama', modelName: process.env.E2E_MODEL_NAME ?? 'my-novel-model', baseUrl: process.env.E2E_OLLAMA_URL ?? 'http://localhost:11434', isDefault: true },
  });
  expect(model.ok(), `model: ${model.status()} ${await model.text()}`).toBeTruthy();

  const instruction = 'Continue the lamp scene in one sentence.';
  const generation = await request.post(`${API_URL}/story-generations/stream`, {
    headers, data: { novelId, episodeId, userMessage: instruction, targetChars: 100 }, timeout: 90_000,
  });
  expect(generation.ok(), `generation: ${generation.status()} ${await generation.text()}`).toBeTruthy();
  const events = (await generation.text()).split('\n').filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)) as { type: string; requestId?: string; message?: string });
  const done = events.find((event) => event.type === 'done');
  expect(done, `stream events: ${JSON.stringify(events.filter((event) => event.type === 'error'))}`).toBeTruthy();

  const detail = await request.get(`${API_URL}/story-generations/${done!.requestId}`, { headers });
  expect(detail.ok()).toBeTruthy();
  expect((await detail.json() as { prompt: string }).prompt).toContain(instruction);

  const stranger = await request.post(`${API_URL}/auth/register`, {
    data: { email: `inspector-stranger-${Date.now()}@example.com`, name: 'Stranger', password: 'e2e-password-123' },
  });
  expect(stranger.ok()).toBeTruthy();
  const { access_token: strangerToken } = await stranger.json() as { access_token: string };
  const forbidden = await request.get(`${API_URL}/story-generations/${done!.requestId}`, {
    headers: { Authorization: `Bearer ${strangerToken}` },
  });
  expect(forbidden.status()).toBe(404);

  await page.addInitScript(([value]) => window.localStorage.setItem('token', value as string), [token]);
  await page.goto(`/writer/novel/${novelId}/episode/${episodeId}`);
  await page.getByRole('button', { name: 'AI Write' }).click();
  const panel = page.getByRole('complementary', { name: 'AI Writing Assistant' });
  await panel.getByRole('button', { name: 'History', exact: true }).click();
  const inspector = page.getByRole('dialog', { name: 'Prompt Inspector' });
  await expect(inspector).toBeVisible();
  await inspector.getByRole('button', { name: /my-novel-model/ }).click();
  await expect(inspector).toContainText(instruction);
  await expect(inspector).toContainText('System prompt');
  await expect(inspector).toContainText('Retrieved chunks');
});
