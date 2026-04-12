import type { AppElements, OptionElements } from "./editor-app-types.js";

export function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

export function requiredQuery<T extends Element>(selector: string): T {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

export function queryAll<T extends Element>(
  root: ParentNode,
  selector: string,
): T[] {
  return Array.from(root.querySelectorAll(selector)) as T[];
}

export function isElement(target: EventTarget | null): target is Element {
  return target instanceof Element;
}

export function isInputLike(
  target: EventTarget | null,
): target is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function isCheckboxInput(
  target: EventTarget | null,
): target is HTMLInputElement {
  return target instanceof HTMLInputElement;
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms: number,
): (...args: TArgs) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: TArgs) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function collectAppElements(): AppElements {
  return {
    appEl: requiredQuery<HTMLElement>(".app"),
    sidebarToggleBtn: requiredElement<HTMLButtonElement>("sidebarToggleBtn"),
    titleInput: requiredElement<HTMLInputElement>("titleInput"),
    resetBtn: requiredElement<HTMLButtonElement>("resetBtn"),
    exportBtn: requiredElement<HTMLButtonElement>("exportBtn"),
    exportDataBtn: requiredElement<HTMLButtonElement>("exportDataBtn"),
    importHtmlBtn: requiredElement<HTMLButtonElement>("importHtmlBtn"),
    importHtmlFile: requiredElement<HTMLInputElement>("importHtmlFile"),
    themeModeBtn: requiredElement<HTMLButtonElement>("themeModeBtn"),
    helpBtn: requiredElement<HTMLButtonElement>("helpBtn"),
    confirmModal: requiredElement<HTMLElement>("confirmModal"),
    confirmTitle: requiredElement<HTMLElement>("confirmTitle"),
    confirmMessage: requiredElement<HTMLElement>("confirmMessage"),
    confirmOk: requiredElement<HTMLButtonElement>("confirmOk"),
    confirmCancel: requiredElement<HTMLButtonElement>("confirmCancel"),
    helpModal: requiredElement<HTMLElement>("helpModal"),
    helpModalClose: requiredElement<HTMLButtonElement>("helpModalClose"),
    sessionsToggle: requiredElement<HTMLElement>("sessionsToggle"),
    sessionsSection: requiredElement<HTMLElement>("sessionsSection"),
    optionsToggle: requiredElement<HTMLElement>("optionsToggle"),
    optionsSection: requiredElement<HTMLElement>("optionsSection"),
    sessionsTree: requiredElement<HTMLElement>("sessionsTree"),
    sessionsSearch: requiredElement<HTMLInputElement>("sessionsSearch"),
    searchResults: requiredElement<HTMLElement>("searchResults"),
    browseToggle: requiredElement<HTMLElement>("browseToggle"),
    browseBody: requiredElement<HTMLElement>("browseBody"),
    browsePathInput: requiredElement<HTMLInputElement>("browsePathInput"),
    browseList: requiredElement<HTMLElement>("browseList"),
    turnsToolbar: requiredElement<HTMLElement>("turnsToolbar"),
    selectAllBtn: requiredElement<HTMLButtonElement>("selectAllBtn"),
    selectNoneBtn: requiredElement<HTMLButtonElement>("selectNoneBtn"),
    expandAllBtn: requiredElement<HTMLButtonElement>("expandAllBtn"),
    collapseAllBtn: requiredElement<HTMLButtonElement>("collapseAllBtn"),
    turnsList: requiredElement<HTMLElement>("turnsList"),
    previewIframe: requiredElement<HTMLIFrameElement>("previewIframe"),
    refreshIndicator: requiredElement<HTMLElement>("refreshIndicator"),
    resizeHandle: requiredElement<HTMLElement>("resizeHandle"),
    redactRulesContainer: requiredElement<HTMLElement>("redactRules"),
    addRuleBtn: requiredElement<HTMLButtonElement>("addRuleBtn"),
    helpVersion: requiredElement<HTMLElement>("helpVersion"),
  };
}

export function collectOptionElements(): OptionElements {
  return {
    theme: requiredElement<HTMLSelectElement>("optTheme"),
    speed: requiredElement<HTMLInputElement>("optSpeed"),
    thinking: requiredElement<HTMLInputElement>("optThinking"),
    toolCalls: requiredElement<HTMLInputElement>("optToolCalls"),
    fontSize: requiredElement<HTMLSelectElement>("optFontSize"),
    redact: requiredElement<HTMLInputElement>("optRedact"),
    userLabel: requiredElement<HTMLInputElement>("optUserLabel"),
    asstLabel: requiredElement<HTMLInputElement>("optAssistantLabel"),
    desc: requiredElement<HTMLTextAreaElement>("optDescription"),
    ogImage: requiredElement<HTMLInputElement>("optOgImage"),
    timing: requiredElement<HTMLSelectElement>("optTiming"),
    minify: requiredElement<HTMLInputElement>("optMinify"),
    compress: requiredElement<HTMLInputElement>("optCompress"),
  };
}
