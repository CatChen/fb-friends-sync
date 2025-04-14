import { launch } from 'puppeteer';
import { loadCookie, saveCookie } from './cookies.js';
import { saveFriends } from './friends.js';

const NAVIGATION_BAR_SELF_SELECTOR =
  'div.x6s0dn4.xkh2ocl.x1q0q8m5.x1qhh985.xu3j5b3.xcfux6l.x26u7qi.xm0m39n.x13fuv20.x972fbf.x9f619.x78zum5.x1q0g3np.x1iyjqo2.xs83m0k.x1qughib.xat24cr.x11i5rnm.x1mh8g0r.xdj266r.x2lwn1j.xeuugli.x18d9i69.x4uap5.xkhd6sd.xexx8yu.x1n2onr6.x1ja2u2z';

const FRIENDS_LIST_SELECTOR =
  'div[aria-label="All friends"] div.xb57i2i.x1q594ok.x5lxg6s.x78zum5.xdt5ytf.x6ikm8r.x1ja2u2z.x1pq812k.x1rohswg.xfk6m8.x1yqm8si.xjx87ck.x1l7klhg.x1iyjqo2.xs83m0k.x2lwn1j.xx8ngbg.xwo3gff.x1oyok0e.x1odjw0f.x1e4zzel.x1n2onr6.xq1qtft';
const FRIENDS_LIST_LOADING_SELECTOR = 'div[aria-label="Loading..."]';
const FRIENDS_LIST_FRIEND_LINK_SELECTOR =
  'a.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.x1lq5wgf.xgqcy7u.x30kzoy.x9jhf4c.x1lliihq';

const CONTACT_NAME_SELECTOR =
  'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x2lah0s.x193iq5w.x1cy8zhl.xexx8yu h1.html-h1.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1vvkbs.x1heor9g.x1qlqyl8.x1pd3egz.x1a2a7pz';
const CONTACT_TRANSLATED_NAME_SELECTOR = 'span.x1q74xe4.x1fcty0u';
const CONTACT_VALUES_SELECTOR =
  'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xamitd3.xsyo7zv.x16hj40l.x10b6aqq.x1yrsyyn div.x78zum5.xdt5ytf.xz62fqu.x16ldp7u span.x3x7a5m.x6prxxf.xvq8zen.xo1l8bm.xzsf02u';
const CONTACT_KEYS_SELECTOR =
  'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xamitd3.xsyo7zv.x16hj40l.x10b6aqq.x1yrsyyn div.x78zum5.xdt5ytf.xz62fqu.x16ldp7u span.x676frb.x1nxh6w3.x1sibtaa.xo1l8bm.xi81zsa';

(async () => {
  const browser = await launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
  await loadCookie(page);
  await page.goto('https://facebook.com');
  await page.waitForSelector(NAVIGATION_BAR_SELF_SELECTOR);

  console.log('Logged in successfully');
  await saveCookie(page);

  await page.goto('https://www.facebook.com/friends/list');
  const friendsList = await page.waitForSelector(FRIENDS_LIST_SELECTOR);
  let friendsListLoading = null;
  try {
    friendsListLoading = await friendsList.waitForSelector(
      FRIENDS_LIST_LOADING_SELECTOR,
      {
        timeout: 5000,
      },
    );
  } catch {
    friendsListLoading === null;
  }
  while (friendsListLoading !== null) {
    try {
      const randomDelay = Math.ceil(Math.random() * 3000) + 1000;
      console.log(`Waiting for ${Math.round(randomDelay / 1000)} seconds`);
      await new Promise((resolve) =>
        setTimeout(() => resolve(true), randomDelay),
      );
      console.log('Scrolling to load more friends');
      await friendsListLoading.scrollIntoViewIfNeeded();
      friendsListLoading = await friendsList.waitForSelector(
        FRIENDS_LIST_LOADING_SELECTOR,
        {
          timeout: 5000,
        },
      );
    } catch {
      break;
    }
  }
  console.log('Friends list fully loaded');

  const friendLinks = await friendsList.$$eval(
    FRIENDS_LIST_FRIEND_LINK_SELECTOR,
    (elements) =>
      elements.map((element) => {
        const url = new URL(element.href);
        url.searchParams.append('sk', 'about_contact_and_basic_info');
        return url.toString();
      }),
  );
  console.log(`${friendLinks.length} friend links found`);

  for (const friendLink of friendLinks) {
    const friendUrl = new URL(friendLink);
    const friendPath = friendUrl.pathname.substring(1);
    const friendId =
      friendPath === 'profile.php'
        ? friendUrl.searchParams.get('id')
        : friendPath;

    await page.goto(friendLink);

    await page.waitForSelector(CONTACT_NAME_SELECTOR);
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
    await saveFriends(friendId, contactEntries);
    console.groupEnd();

    const randomDelay = Math.ceil(Math.random() * 3000) + 1000;
    console.log(`Waiting for ${Math.round(randomDelay / 1000)} seconds`);
    await new Promise((resolve) =>
      setTimeout(() => resolve(true), randomDelay),
    );
  }
  console.log('Done');

  await browser.close();
})().catch(console.error);
