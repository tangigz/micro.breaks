/** The two micro.breaks tabs: the pinned home tab and the single prompt tab. */

const homeUrl = () => browser.runtime.getURL('/newtab.html');
const promptUrl = () => browser.runtime.getURL('/prompt.html');

async function tabsAt(url: string) {
  const tabs = await browser.tabs.query({});
  return tabs.filter((t) => t.url?.startsWith(url) || t.pendingUrl?.startsWith(url));
}

async function focus(tab: { id?: number; windowId?: number }) {
  if (tab.id != null) await browser.tabs.update(tab.id, { active: true });
  // drawAttention flashes the Chrome icon when macOS keeps another app in front.
  if (tab.windowId != null)
    await browser.windows.update(tab.windowId, { focused: true, drawAttention: true });
}

async function normalWindowId(): Promise<number | undefined> {
  try {
    const win = await browser.windows.getLastFocused({ windowTypes: ['normal'] });
    return win.id;
  } catch {
    return undefined;
  }
}

/** Opens the prompt in a new tab and switches to it, or brings back the one already open. */
export async function openPromptTab() {
  const [existing] = await tabsAt(promptUrl());
  if (existing) return focus(existing);
  const windowId = await normalWindowId();
  if (windowId == null) {
    await browser.windows.create({ url: promptUrl(), focused: true });
    return;
  }
  const tab = await browser.tabs.create({ windowId, url: promptUrl(), active: true });
  await focus(tab);
}

export async function closePromptTab() {
  const tabs = await tabsAt(promptUrl());
  if (tabs.length) await browser.tabs.remove(tabs.map((t) => t.id!).filter((id) => id != null));
}

/** micro.breaks is the first tab, pinned, every time Chrome starts; reused if already open. */
export async function ensureHomeTab() {
  const tabs = await tabsAt(homeUrl());
  if (tabs.some((t) => t.pinned)) return;
  const windowId = await normalWindowId();
  if (windowId == null) return;
  await browser.tabs.create({ windowId, url: homeUrl(), pinned: true, index: 0, active: false });
}

export async function openHomeTab() {
  const tabs = await tabsAt(homeUrl());
  const pinned = tabs.find((t) => t.pinned) ?? tabs[0];
  if (pinned) return focus(pinned);
  const windowId = await normalWindowId();
  const tab = await browser.tabs.create({ windowId, url: homeUrl(), pinned: true, index: 0, active: true });
  await focus(tab);
}
