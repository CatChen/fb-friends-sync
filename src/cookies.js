import { promises as fs, existsSync } from 'node:fs';
import * as path from 'node:path';

const COOKIES_PATH = 'artifacts/cookies.json';

export async function saveCookie(page) {
  const cookies = await page.cookies();
  fs.mkdir(path.dirname(COOKIES_PATH), { recursive: true });
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
}

export async function loadCookie(page) {
  if (existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH));
    await page.setCookie(...cookies);
  }
}
