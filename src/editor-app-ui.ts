import { hasSessionChanges } from "./editor-app-store.js";
import type { AppElements, AppState } from "./editor-app-types.js";

/**
 * UI helpers shared across editor controllers.
 */
export interface EditorUiActions {
  toggleSidebarSection(toggle: HTMLElement, section: HTMLElement): void;
  showOptionsPanel(): void;
  showConfirm(title: string, message: string): Promise<boolean>;
  updateEditState(textEdits?: boolean): void;
}

export function createEditorUiActions(
  state: AppState,
  elements: AppElements,
): EditorUiActions {
  function toggleSidebarSection(
    toggle: HTMLElement,
    section: HTMLElement,
  ): void {
    toggle.classList.toggle("open");
    section.classList.toggle("open");
  }

  function showOptionsPanel(): void {
    elements.optionsToggle.classList.add("open");
    elements.optionsSection.classList.add("open");
  }

  function showConfirm(title: string, message: string): Promise<boolean> {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmModal.classList.add("open");

    return new Promise((resolve) => {
      function cleanup(): void {
        elements.confirmModal.classList.remove("open");
        elements.confirmOk.removeEventListener("click", onOk);
        elements.confirmCancel.removeEventListener("click", onCancel);
      }

      function onOk(): void {
        cleanup();
        resolve(true);
      }

      function onCancel(): void {
        cleanup();
        resolve(false);
      }

      elements.confirmOk.addEventListener("click", onOk);
      elements.confirmCancel.addEventListener("click", onCancel);
    });
  }

  function updateEditState(textEdits?: boolean): void {
    if (textEdits !== undefined) {
      state.hasTextEdits = textEdits;
    }
    const hasChanges = hasSessionChanges(state);
    elements.resetBtn.classList.toggle("btn-warn", hasChanges);
    const activeItem = document.querySelector<HTMLElement>(
      ".session-item.active",
    );
    if (activeItem) {
      activeItem.classList.toggle("edited", hasChanges);
    }
  }

  return {
    toggleSidebarSection,
    showOptionsPanel,
    showConfirm,
    updateEditState,
  };
}
