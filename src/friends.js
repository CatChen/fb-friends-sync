import { promises as fs, existsSync } from 'node:fs';
import * as path from 'node:path';

const CONTACTS_PATH = 'artifacts/friends.json';

export async function saveFriends(contactName, contactEntries) {
  const contacts = (await loadFriends()) ?? {};
  if (contacts[contactName]) {
    console.warn(`Friend "${contactName}" already exists`);
    contacts[contactName] = { ...contacts[contactName], ...contactEntries };
  } else {
    contacts[contactName] = contactEntries;
  }
  fs.mkdir(path.dirname(CONTACTS_PATH), { recursive: true });
  await fs.writeFile(CONTACTS_PATH, JSON.stringify(contacts, null, 2));
}

export async function loadFriends() {
  if (existsSync(CONTACTS_PATH)) {
    const contacts = JSON.parse(await fs.readFile(CONTACTS_PATH));
    return contacts;
  }
}
