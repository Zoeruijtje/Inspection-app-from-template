// Phase 3A0-A — Builder React Context with undo/redo

import React, { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from 'react';
import type { Command, Container, FormTemplate, SaveStatus } from './types';
import {
  createInitialTemplate,
  deepClone,
  createAddBlockCommand,
  createDeleteBlockCommand,
  createMoveBlockCommand,
  createAddContainerCommand,
  findBlockParent,
  renumberBlocks,
  type BuilderUIState,
} from './state';

// ---- Action types ---------------------------------------------------------

type BuilderAction =
  | { type: 'ADD_BLOCK'; containerId: string; blockTypeId: string; position?: number | 'end' }
  | { type: 'DELETE_BLOCK'; blockId: string }
  | { type: 'MOVE_BLOCK'; blockId: string; fromContainerId: string; toContainerId: string; toIndex: number }
  | { type: 'MOVE_BLOCK_UP'; blockId: string }
  | { type: 'MOVE_BLOCK_DOWN'; blockId: string }
  | { type: 'MOVE_CONTAINER_UP'; containerId: string }
  | { type: 'MOVE_CONTAINER_DOWN'; containerId: string }
  | { type: 'ADD_SECTION'; pageId: string }
  | { type: 'ADD_GROUP'; containerId: string }
  | { type: 'DELETE_CONTAINER'; containerId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_REQUEST' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_FAILURE' }
  | { type: 'ROLLBACK' }
  | { type: 'SET_SELECTED_BLOCK'; blockId: string | null }
  | { type: 'SET_SELECTED_CONTAINER'; containerId: string | null }
  | { type: 'SET_ACTIVE_PAGE'; pageId: string }
  | {
      type: 'RESTORE_SNAPSHOT';
      template: FormTemplate;
      saveStatus: SaveStatus;
      undoStack?: Command[];
      redoStack?: Command[];
    };

// ---- State shape ----------------------------------------------------------

export interface BuilderState {
  template: FormTemplate;
  undoStack: Command[];
  redoStack: Command[];
  saveStatus: SaveStatus;
  lastSavedSnapshot: FormTemplate | null;
  simulateFailure: boolean;
  ui: BuilderUIState;
}

function initialState(): BuilderState {
  const template = createInitialTemplate();
  return {
    template,
    undoStack: [],
    redoStack: [],
    saveStatus: 'saved',
    lastSavedSnapshot: deepClone(template),
    simulateFailure: false,
    ui: {
      activePageId: template.pages[0]?.id || null,
      activeSectionId: template.pages[0]?.children[0]?.id || null,
      selectedBlockId: null,
      selectedContainerId: null,
    },
  };
}

// ---- Reducer --------------------------------------------------------------

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'ADD_BLOCK': {
      const cmd = createAddBlockCommand(action.containerId, action.blockTypeId, action.position ?? 'end');
      const newTemplate = cmd.execute(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: [...state.undoStack.slice(-19), cmd],
        redoStack: [],
        saveStatus: 'unsaved',
        ui: { ...state.ui, selectedBlockId: null },
      };
    }

    case 'DELETE_BLOCK': {
      const cmd = createDeleteBlockCommand(action.blockId);
      const newTemplate = cmd.execute(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: [...state.undoStack.slice(-19), cmd],
        redoStack: [],
        saveStatus: 'unsaved',
        ui: { ...state.ui, selectedBlockId: null, selectedContainerId: null },
      };
    }

    case 'MOVE_BLOCK': {
      const cmd = createMoveBlockCommand(
        action.blockId,
        action.fromContainerId,
        action.toContainerId,
        action.toIndex,
      );
      const newTemplate = cmd.execute(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: [...state.undoStack.slice(-19), cmd],
        redoStack: [],
        saveStatus: 'unsaved',
      };
    }

    case 'MOVE_BLOCK_UP': {
      const blockId = action.blockId;
      const template = state.template;
      let found: { parent: Container; index: number } | null = null;
      for (const page of template.pages) {
        found = findBlockParent(page, blockId);
        if (found) break;
        // check nested children
        found = _findInChildren(page.children, blockId);
        if (found) break;
      }
      if (!found || found.index === 0) return state;
      const newTemplate = deepClone(template);
      let newFound: { parent: Container; index: number } | null = null;
      for (const page of newTemplate.pages) {
        newFound = findBlockParent(page, blockId);
        if (newFound) break;
        newFound = _findInChildren(page.children, blockId);
        if (newFound) break;
      }
      if (!newFound) return state;
      const blocks = newFound.parent.blocks;
      [blocks[newFound.index], blocks[newFound.index - 1]] = [blocks[newFound.index - 1], blocks[newFound.index]];
      newFound.parent.blocks = renumberBlocks(blocks);
      return {
        ...state,
        template: newTemplate,
        saveStatus: 'unsaved',
        // For move-up/down, push a simple reorder command
        undoStack: [...state.undoStack.slice(-19), {
          type: 'REORDER_BLOCKS',
          timestamp: Date.now(),
          description: 'Move block up',
          execute: (_s) => _s,
          undo: (_s) => deepClone(template),
        }],
        redoStack: [],
      };
    }

    case 'MOVE_BLOCK_DOWN': {
      const blockId = action.blockId;
      const template = state.template;
      let found: { parent: Container; index: number } | null = null;
      for (const page of template.pages) {
        found = findBlockParent(page, blockId);
        if (found) break;
        found = _findInChildren(page.children, blockId);
        if (found) break;
      }
      if (!found || found.index >= found.parent.blocks.length - 1) return state;
      const newTemplate = deepClone(template);
      let newFound: { parent: Container; index: number } | null = null;
      for (const page of newTemplate.pages) {
        newFound = findBlockParent(page, blockId);
        if (newFound) break;
        newFound = _findInChildren(page.children, blockId);
        if (newFound) break;
      }
      if (!newFound) return state;
      const blocks = newFound.parent.blocks;
      [blocks[newFound.index], blocks[newFound.index + 1]] = [blocks[newFound.index + 1], blocks[newFound.index]];
      newFound.parent.blocks = renumberBlocks(blocks);
      return {
        ...state,
        template: newTemplate,
        saveStatus: 'unsaved',
        undoStack: [...state.undoStack.slice(-19), {
          type: 'REORDER_BLOCKS',
          timestamp: Date.now(),
          description: 'Move block down',
          execute: (_s) => _s,
          undo: (_s) => deepClone(template),
        }],
        redoStack: [],
      };
    }

    case 'MOVE_CONTAINER_UP': {
      const template = state.template;
      let found: { parent: Container; index: number } | null = null;
      for (const page of template.pages) {
        found = _findContainerParent(page, action.containerId);
        if (found) break;
      }
      if (!found || found.index === 0) return state;
      const newTemplate = deepClone(template);
      let newFound: { parent: Container; index: number } | null = null;
      for (const page of newTemplate.pages) {
        newFound = _findContainerParent(page, action.containerId);
        if (newFound) break;
      }
      if (!newFound) return state;
      const children = newFound.parent.children;
      [children[newFound.index], children[newFound.index - 1]] = [children[newFound.index - 1], children[newFound.index]];
      return {
        ...state,
        template: newTemplate,
        saveStatus: 'unsaved',
        undoStack: [...state.undoStack.slice(-19), {
          type: 'REORDER_BLOCKS',
          timestamp: Date.now(),
          description: 'Move container up',
          execute: (_s) => _s,
          undo: (_s) => deepClone(template),
        }],
        redoStack: [],
      };
    }

    case 'MOVE_CONTAINER_DOWN': {
      const template = state.template;
      let found: { parent: Container; index: number } | null = null;
      for (const page of template.pages) {
        found = _findContainerParent(page, action.containerId);
        if (found) break;
      }
      if (!found || found.index >= found.parent.children.length - 1) return state;
      const newTemplate = deepClone(template);
      let newFound: { parent: Container; index: number } | null = null;
      for (const page of newTemplate.pages) {
        newFound = _findContainerParent(page, action.containerId);
        if (newFound) break;
      }
      if (!newFound) return state;
      const children = newFound.parent.children;
      [children[newFound.index], children[newFound.index + 1]] = [children[newFound.index + 1], children[newFound.index]];
      return {
        ...state,
        template: newTemplate,
        saveStatus: 'unsaved',
        undoStack: [...state.undoStack.slice(-19), {
          type: 'REORDER_BLOCKS',
          timestamp: Date.now(),
          description: 'Move container down',
          execute: (_s) => _s,
          undo: (_s) => deepClone(template),
        }],
        redoStack: [],
      };
    }

    case 'ADD_SECTION': {
      const cmd = createAddContainerCommand(action.pageId, 'section');
      const newTemplate = cmd.execute(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: [...state.undoStack.slice(-19), cmd],
        redoStack: [],
        saveStatus: 'unsaved',
      };
    }

    case 'ADD_GROUP': {
      const cmd = createAddContainerCommand(action.containerId, 'group');
      const newTemplate = cmd.execute(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: [...state.undoStack.slice(-19), cmd],
        redoStack: [],
        saveStatus: 'unsaved',
      };
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const cmd = state.undoStack[state.undoStack.length - 1];
      const newTemplate = cmd.undo(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, cmd],
        saveStatus: 'unsaved',
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const cmd = state.redoStack[state.redoStack.length - 1];
      const newTemplate = cmd.execute(state.template);
      return {
        ...state,
        template: newTemplate,
        undoStack: [...state.undoStack, cmd],
        redoStack: state.redoStack.slice(0, -1),
        saveStatus: 'unsaved',
      };
    }

    case 'SAVE_REQUEST':
      return { ...state, saveStatus: 'saving' };

    case 'SAVE_SUCCESS': {
      const snapshot = deepClone(state.template);
      return {
        ...state,
        saveStatus: 'saved',
        lastSavedSnapshot: snapshot,
      };
    }

    case 'SAVE_FAILURE':
      return { ...state, saveStatus: 'failed' };

    case 'ROLLBACK': {
      if (!state.lastSavedSnapshot) return state;
      return {
        ...state,
        template: deepClone(state.lastSavedSnapshot),
        saveStatus: 'saved',
        undoStack: [],
        redoStack: [],
      };
    }

    case 'SET_SELECTED_BLOCK':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedBlockId: action.blockId,
          selectedContainerId: null,
        },
      };

    case 'SET_SELECTED_CONTAINER':
      return {
        ...state,
        ui: {
          ...state.ui,
          selectedBlockId: null,
          selectedContainerId: action.containerId,
        },
      };

    case 'SET_ACTIVE_PAGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          activePageId: action.pageId,
          activeSectionId: state.template.pages.find(p => p.id === action.pageId)?.children[0]?.id || null,
        },
      };

    case 'RESTORE_SNAPSHOT':
      return {
        ...state,
        template: action.template,
        saveStatus: action.saveStatus,
        undoStack: action.undoStack ?? state.undoStack,
        redoStack: action.redoStack ?? state.redoStack,
      };

    default:
      return state;
  }
}

function _findInChildren(containers: Container[], blockId: string): { parent: Container; index: number } | null {
  for (const c of containers) {
    const found = findBlockParent(c, blockId);
    if (found) return found;
    const nested = _findInChildren(c.children, blockId);
    if (nested) return nested;
  }
  return null;
}

function _findContainerParent(container: Container, childId: string): { parent: Container; index: number } | null {
  const idx = container.children.findIndex(c => c.id === childId);
  if (idx !== -1) return { parent: container, index: idx };
  for (const child of container.children) {
    const result = _findContainerParent(child, childId);
    if (result) return result;
  }
  return null;
}

// ---- Context --------------------------------------------------------------

interface BuilderContextValue {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
  toggleSimulateFailure: () => void;
  handleSave: () => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(builderReducer, undefined, initialState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleSimulateFailure = useCallback(() => {
    // We toggle via direct state mutation through a special action...
    // Actually, let's use a ref-based approach instead
    // We'll handle this in the component by casting
    dispatch({ type: 'SAVE_REQUEST' } as BuilderAction); // dummy to trigger re-render handling
  }, []);

  const handleSave = useCallback(() => {
    dispatch({ type: 'SAVE_REQUEST' });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      // Read simulateFailure from a module-level variable
      if (_simulateFailure) {
        dispatch({ type: 'SAVE_FAILURE' });
        // Rollback after a short delay
        setTimeout(() => {
          dispatch({ type: 'ROLLBACK' });
        }, 300);
      } else {
        dispatch({ type: 'SAVE_SUCCESS' });
      }
    }, 500);
  }, []);

  return (
    <BuilderContext.Provider value={{ state, dispatch, toggleSimulateFailure, handleSave }}>
      {children}
    </BuilderContext.Provider>
  );
}

// Module-level variable for simulateFailure (avoids complex state wiring)
let _simulateFailure = false;
export function setSimulateFailure(v: boolean) {
  _simulateFailure = v;
}
export function getSimulateFailure(): boolean {
  return _simulateFailure;
}

export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider');
  return ctx;
}
