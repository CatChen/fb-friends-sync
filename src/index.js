import { launch } from 'puppeteer';
import { loadCookie, saveCookie } from './cookies.js';
import { saveContact } from './contacts.js';

const NAVIGATION_BAR_SELF_SELECTOR =
  'div.x6s0dn4.xkh2ocl.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.x2lwn1j.xeuugli.x18d9i69.x4uap5.xkhd6sd.xexx8yu.x1n2onr6.x1ja2u2z';
const CONTACT_NAME_SELECTOR =
  'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1cy8zhl.xexx8yu h1.html-h1.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1vvkbs.x1heor9g.x1qlqyl8.x1pd3egz.x1a2a7pz';
const CONTACT_TRANSLATED_NAME_SELECTOR = 'span.x1q74xe4.x1fcty0u';
const CONTACT_VALUES_SELECTOR =
  'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xamitd3.xsyo7zv.x16hj40l.x10b6aqq.x1yrsyyn div.x78zum5.xdt5ytf.xz62fqu.x16ldp7u span.x3x7a5m.x6prxxf.xvq8zen.xo1l8bm.xzsf02u';
const CONTACT_KEYS_SELECTOR =
  'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xamitd3.xsyo7zv.x16hj40l.x10b6aqq.x1yrsyyn div.x78zum5.xdt5ytf.xz62fqu.x16ldp7u span.x676frb.x1nxh6w3.x1sibtaa.xo1l8bm.xi81zsa';

(async () => {
  const { default: friends } = await import('./friends.json', {
    assert: { type: 'json' },
  });
  const friendContacts = friends.map((friend) => {
    const url = new URL(friend);
    url.searchParams.append('sk', 'about_contact_and_basic_info');
    return url.toString();
  });

  const browser = await launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await loadCookie(page);
  await page.goto('https://facebook.com');
  await page.waitForSelector(NAVIGATION_BAR_SELF_SELECTOR, { timeout: 0 });

  console.log('Ready');
  for (const friendContact of friendContacts) {
    const friendUrl = new URL(friendContact);
    const friendPath = friendUrl.pathname.substring(1);
    const friendId =
      friendPath === 'profile.php'
        ? friendUrl.searchParams.get('id')
        : friendPath;

    await page.goto(friendContact);

    await page.waitForSelector(CONTACT_NAME_SELECTOR, { timeout: 0 });
    const contactTranslatedNameElement = await page.$(
      CONTACT_TRANSLATED_NAME_SELECTOR,
    );
    const contactTranslatedName = contactTranslatedNameElement
      ? await page.$eval(CONTACT_TRANSLATED_NAME_SELECTOR, (element) =>
          element.textContent.trim().replace(/^\(|\)$/g, ''),
        )
      : null;
    const contactName = contactTranslatedNameElement
      ? await page.$eval(
          CONTACT_NAME_SELECTOR,
          (element, contactTranslatedName) =>
            element.textContent
              .substring(
                0,
                element.textContent.length - contactTranslatedName.length - 2,
              )
              .trim(),
          contactTranslatedName,
        )
      : await page.$eval(CONTACT_NAME_SELECTOR, (element) =>
          element.textContent.trim(),
        );

    console.group(
      contactTranslatedName
        ? `${contactName} (${contactTranslatedName})`
        : contactName,
    );
    const contactValues = await page
      .$$eval(CONTACT_VALUES_SELECTOR, (elements) =>
        elements.map((element) => element.textContent.trim()),
      )
      .catch(() => []);

    const contactKeys = await page
      .$$eval(CONTACT_KEYS_SELECTOR, (elements) =>
        elements.map((element) => element.textContent.trim()),
      )
      .catch(() => []);

    if (contactKeys.length !== contactValues.length) {
      console.error('Error: Contact keys and values mismatch');
      for (
        let i = 0;
        i < Math.max(contactKeys.length, contactValues.length);
        i++
      ) {
        console.error(`${contactKeys[i]}: ${contactValues[i]}`);
      }
      console.groupEnd();
      continue;
    }

    const contactEntries = {};
    for (let i = 0; i < contactKeys.length; i++) {
      if (contactEntries[contactKeys[i]]) {
        if (!Array.isArray(contactEntries[contactKeys[i]])) {
          contactEntries[contactKeys[i]] = [contactEntries[contactKeys[i]]];
        }
        contactEntries[contactKeys[i]].push(contactValues[i]);
      }
      contactEntries[contactKeys[i]] = contactValues[i];
    }
    contactEntries['Name'] = contactName;
    if (contactTranslatedName) {
      contactEntries['Translated Name'] = contactTranslatedName;
    }
    console.log(contactEntries);
    await saveContact(friendId, contactEntries);
    console.groupEnd();

    const randomDelay = Math.floor(Math.random() * 3000) + 1000;
    console.log(`Waiting for ${Math.round(randomDelay / 1000)} seconds`);
    await new Promise((resolve) =>
      setTimeout(() => resolve(true), randomDelay),
    );
  }
  console.log('Done');

  await saveCookie(page);
  await browser.close();
})().catch(console.error);
