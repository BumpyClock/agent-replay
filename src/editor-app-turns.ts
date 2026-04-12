import type { EditorApiClient } from "./editor-app-api.js";
import {
  debounce,
  isCheckboxInput,
  isElement,
  isInputLike,
  queryAll,
} from "./editor-app-dom.js";
import { renderTurns } from "./editor-app-render.js";
import type { AppElements, AppState } from "./editor-app-types.js";
import type { EditorUiActions } from "./editor-app-ui.js";

/**
 * Turn list renderer and interaction controller.
 */
export interface TurnController {
  renderTurnsView(): void;
  handleTurnClick(event: Event): void;
  handleTurnChange(event: Event): void;
  handleTurnInput(event: Event): void;
  selectAllTurns(): void;
  selectNoTurns(): void;
  expandAllTurnBlocks(includeNestedHeaders?: boolean): void;
  collapseAllTurnBlocks(): void;
}

interface TurnControllerDeps {
  api: EditorApiClient;
  state: AppState;
  elements: AppElements;
  ui: Pick<EditorUiActions, "updateEditState">;
  schedulePreview(): void;
}

export function createTurnController({
  api,
  state,
  elements,
  ui,
  schedulePreview,
}: TurnControllerDeps): TurnController {
  function renderTurnsView(): void {
    elements.turnsList.innerHTML = renderTurns(
      state.currentTurns,
      state.excludedTurns,
      state.bookmarks,
    );
  }

  function setTurnChecked(index: number, checked: boolean): void {
    const checkbox = elements.turnsList.querySelector<HTMLInputElement>(
      `input[data-action="toggle"][data-index="${index}"]`,
    );
    if (!checkbox) {
      return;
    }

    checkbox.checked = checked;
    if (checked) {
      state.excludedTurns.delete(index);
    } else {
      state.excludedTurns.add(index);
    }

    const card = checkbox.closest<HTMLElement>(".turn-card");
    card?.classList.toggle("excluded", !checked);
    if (!checked) {
      card
        ?.querySelector<HTMLElement>("[data-action='expand']")
        ?.classList.remove("open");
      card
        ?.querySelector<HTMLElement>(".turn-blocks-detail")
        ?.classList.remove("open");
    }
  }

  function handleTurnClick(event: Event): void {
    if (!isElement(event.target)) {
      return;
    }

    const blockHeader = event.target.closest<HTMLElement>(".block-item-header");
    if (blockHeader) {
      blockHeader.classList.toggle("open");
      return;
    }

    const summary = event.target.closest<HTMLElement>("[data-action='expand']");
    if (summary) {
      const index = summary.dataset.index;
      if (!index) {
        return;
      }
      const detail = document.getElementById(`blocks-${index}`);
      if (detail) {
        summary.classList.toggle("open");
        detail.classList.toggle("open");
      }
      return;
    }

    const header = event.target.closest<HTMLElement>(".turn-card-header");
    if (header && !event.target.closest("input")) {
      const card = header.closest<HTMLElement>(".turn-card");
      const index = Number.parseInt(card?.dataset.index || "", 10);
      if (!index || !elements.previewIframe.contentWindow) {
        return;
      }

      const included = state.currentTurns.filter(
        (turn) => !state.excludedTurns.has(turn.index),
      );
      const position = included.findIndex((turn) => turn.index === index);
      if (position >= 0) {
        try {
          elements.previewIframe.contentWindow.location.hash = `#turn=${position + 1}`;
        } catch {}
      }
    }
  }

  function handleTurnChange(event: Event): void {
    if (!isInputLike(event.target)) {
      return;
    }

    const action = event.target.dataset.action;
    const index = Number.parseInt(event.target.dataset.index || "", 10);
    if (!action || Number.isNaN(index)) {
      return;
    }

    if (action === "toggle") {
      if (!isCheckboxInput(event.target)) {
        return;
      }
      const checked = event.target.checked;
      if (
        state.lastClickShift &&
        state.lastToggleIndex !== null &&
        state.lastToggleIndex !== index
      ) {
        const from = Math.min(state.lastToggleIndex, index);
        const to = Math.max(state.lastToggleIndex, index);
        for (const turn of state.currentTurns) {
          if (turn.index >= from && turn.index <= to) {
            setTurnChecked(turn.index, checked);
          }
        }
      } else {
        setTurnChecked(index, checked);
      }

      state.lastToggleIndex = index;
      ui.updateEditState();
      schedulePreview();
      return;
    }

    if (action === "bookmark") {
      if (!isCheckboxInput(event.target)) {
        return;
      }
      const labelInput = elements.turnsList.querySelector<HTMLInputElement>(
        `input[data-action="bookmark-label"][data-index="${index}"]`,
      );
      if (!labelInput) {
        return;
      }

      if (event.target.checked) {
        state.bookmarks.set(index, labelInput.value || `Turn ${index}`);
        labelInput.disabled = false;
      } else {
        state.bookmarks.delete(index);
        labelInput.disabled = true;
      }
      ui.updateEditState();
      schedulePreview();
    }
  }

  const debouncedEdit = debounce(
    (sessionId: string, turnIndex: number, userText: string) => {
      if (sessionId !== state.currentSessionId) {
        return;
      }
      void api
        .editTurn(sessionId, turnIndex, userText)
        .then((data) => {
          ui.updateEditState(data.hasEdits);
          schedulePreview();
        })
        .catch((error) => {
          console.error("Edit failed:", error);
        });
    },
    300,
  );

  function handleTurnInput(event: Event): void {
    if (!isInputLike(event.target)) {
      return;
    }

    const action = event.target.dataset.action;
    const index = Number.parseInt(event.target.dataset.index || "", 10);
    if (!action || Number.isNaN(index)) {
      return;
    }

    if (action === "edit" && state.currentSessionId) {
      debouncedEdit(state.currentSessionId, index, event.target.value);
      return;
    }

    if (action === "bookmark-label" && state.bookmarks.has(index)) {
      state.bookmarks.set(index, event.target.value || `Turn ${index}`);
      schedulePreview();
    }
  }

  function selectAllTurns(): void {
    state.excludedTurns.clear();
    queryAll<HTMLInputElement>(
      elements.turnsList,
      "[data-action='toggle']",
    ).forEach((checkbox) => {
      checkbox.checked = true;
    });
    queryAll<HTMLElement>(elements.turnsList, ".turn-card").forEach((card) => {
      card.classList.remove("excluded");
    });
    ui.updateEditState();
    schedulePreview();
  }

  function selectNoTurns(): void {
    state.currentTurns.forEach((turn) => {
      state.excludedTurns.add(turn.index);
    });
    queryAll<HTMLInputElement>(
      elements.turnsList,
      "[data-action='toggle']",
    ).forEach((checkbox) => {
      checkbox.checked = false;
    });
    queryAll<HTMLElement>(elements.turnsList, ".turn-card").forEach((card) => {
      card.classList.add("excluded");
    });
    collapseAllTurnBlocks();
    ui.updateEditState();
    schedulePreview();
  }

  function expandAllTurnBlocks(includeNestedHeaders = false): void {
    queryAll<HTMLElement>(elements.turnsList, "[data-action='expand']").forEach(
      (summary) => {
        summary.classList.add("open");
      },
    );
    queryAll<HTMLElement>(elements.turnsList, ".turn-blocks-detail").forEach(
      (detail) => {
        detail.classList.add("open");
      },
    );
    if (includeNestedHeaders) {
      queryAll<HTMLElement>(elements.turnsList, ".block-item-header").forEach(
        (header) => {
          header.classList.add("open");
        },
      );
    }
  }

  function collapseAllTurnBlocks(): void {
    queryAll<HTMLElement>(elements.turnsList, "[data-action='expand']").forEach(
      (summary) => {
        summary.classList.remove("open");
      },
    );
    queryAll<HTMLElement>(elements.turnsList, ".turn-blocks-detail").forEach(
      (detail) => {
        detail.classList.remove("open");
      },
    );
  }

  return {
    renderTurnsView,
    handleTurnClick,
    handleTurnChange,
    handleTurnInput,
    selectAllTurns,
    selectNoTurns,
    expandAllTurnBlocks,
    collapseAllTurnBlocks,
  };
}
