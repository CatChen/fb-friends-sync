import { promises as fs, existsSync } from 'node:fs';
import * as path from 'node:path';

const CONTACTS_PATH = 'artifacts/contacts.json';

export async function saveContact(contactName, contactEntries) {
  const contacts = (await loadContact()) ?? {};
  if (contacts[contactName]) {
    console.error(`Error: Contact "${contactName}" already exists`);
  }
  contacts[contactName] = contactEntries;
  fs.mkdir(path.dirname(CONTACTS_PATH), { recursive: true });
  await fs.writeFile(CONTACTS_PATH, JSON.stringify(contacts, null, 2));
}

export async function loadContact() {
  if (existsSync(CONTACTS_PATH)) {
    const contacts = JSON.parse(await fs.readFile(CONTACTS_PATH));
    return contacts;
  }
}
