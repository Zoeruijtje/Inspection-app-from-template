// Phase 3A0-A — In-memory state: reducer, undo/redo, helper functions

import type { BlockInstance, Command, Container, FormTemplate } from './types';
import { BLOCK_CATALOGUE } from './blockCatalogue';

// ---- ID generators --------------------------------------------------------

let _nextId = 1;
export function generateId(prefix = 'id'): string {
  return `${prefix}_${_nextId++}_${Date.now().toString(36)}`;
}

// ---- Initial state --------------------------------------------------------

export function createInitialTemplate(): FormTemplate {
  const page1: Container = {
    id: generateId('page'),
    type: 'page',
    title: 'Page 1',
    sortOrder: 0,
    children: [
      {
        id: generateId('section'),
        type: 'section',
        title: 'Section 1',
        sortOrder: 0,
        children: [],
        blocks: [
          createBlockInstance('heading', 'Inspection Form'),
          createBlockInstance('paragraph', 'Please complete all required fields below.'),
        ],
      },
    ],
    blocks: [],
  };
  return { id: generateId('tmpl'), name: 'Untitled Template', pages: [page1] };
}

function createBlockInstance(blockTypeId: string, label?: string): BlockInstance {
  const def = BLOCK_CATALOGUE.find(b => b.id === blockTypeId);
  return {
    id: generateId('block'),
    blockTypeId,
    label: label || def?.label || blockTypeId,
    sortOrder: 0,
    config: {},
  };
}

// ---- Deep clone helper ----------------------------------------------------

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ---- Container helpers ----------------------------------------------------

/** Find a container by id anywhere in the tree. */
export function findContainer(root: Container, id: string): Container | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findContainer(child, id);
    if (found) return found;
  }
  return null;
}

/** Find the parent container of a given container id. */
export function findParentContainer(root: Container, childId: string): Container | null {
  for (const child of root.children) {
    if (child.id === childId) return root;
    const found = findParentContainer(child, childId);
    if (found) return found;
  }
  return null;
}

/** Find parent container of a block. Returns { parent, index }. */
export function findBlockParent(
  container: Container,
  blockId: string,
): { parent: Container; index: number } | null {
  const idx = container.blocks.findIndex(b => b.id === blockId);
  if (idx !== -1) return { parent: container, index: idx };
  for (const child of container.children) {
    const result = findBlockParent(child, blockId);
    if (result) return result;
  }
  return null;
}

/** Find a page container in the template. */
export function findPage(template: FormTemplate, pageId: string): Container | null {
  return template.pages.find(p => p.id === pageId) || null;
}

/** Re-number sortOrder of blocks in a container sequentially. */
export function renumberBlocks(blocks: BlockInstance[]): BlockInstance[] {
  return blocks.map((b, i) => ({ ...b, sortOrder: i }));
}

/** Re-number sortOrder of child containers. */
export function renumberContainers(containers: Container[]): Container[] {
  return containers.map((c, i) => ({ ...c, sortOrder: i }));
}

// ---- Command factory functions --------------------------------------------

export function createAddBlockCommand(
  containerId: string,
  blockTypeId: string,
  position: number | 'end',
): Command {
  const block = createBlockInstance(blockTypeId);
  return {
    type: 'ADD_BLOCK',
    timestamp: Date.now(),
    description: `Add ${block.label}`,
    execute: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      for (const page of next.pages) {
        const container = findContainer(page, containerId);
        if (!container) {
          // search recursively in children
          const found = searchAllContainers(next.pages, containerId);
          if (found) {
            const idx = position === 'end' ? found.blocks.length : Math.min(position, found.blocks.length);
            found.blocks.splice(idx, 0, block);
            found.blocks = renumberBlocks(found.blocks);
          }
          continue;
        }
        const idx = position === 'end' ? container.blocks.length : Math.min(position, container.blocks.length);
        container.blocks.splice(idx, 0, { ...block, id: block.id });
        container.blocks = renumberBlocks(container.blocks);
        return next;
      }
      return next;
    },
    undo: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      for (const page of next.pages) {
        const result = findBlockParent(page, block.id);
        if (result) {
          result.parent.blocks.splice(result.index, 1);
          result.parent.blocks = renumberBlocks(result.parent.blocks);
          return next;
        }
        // Search in children too
        const recursiveResult = findBlockParentInTree(page, block.id);
        if (recursiveResult) {
          recursiveResult.parent.blocks.splice(recursiveResult.index, 1);
          recursiveResult.parent.blocks = renumberBlocks(recursiveResult.parent.blocks);
          return next;
        }
      }
      return next;
    },
  };
}

function searchAllContainers(containers: Container[], id: string): Container | null {
  for (const c of containers) {
    if (c.id === id) return c;
    const found = searchAllContainers(c.children, id);
    if (found) return found;
  }
  return null;
}

function findBlockParentInTree(container: Container, blockId: string): { parent: Container; index: number } | null {
  const result = findBlockParent(container, blockId);
  if (result) return result;
  return null;
}

export function createDeleteBlockCommand(blockId: string): Command {
  let snapshot: { parentId: string; block: BlockInstance; index: number } | null = null;

  return {
    type: 'DELETE_BLOCK',
    timestamp: Date.now(),
    description: 'Delete block',
    execute: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      for (const page of next.pages) {
        const result = findBlockParent(page, blockId);
        if (result) {
          snapshot = {
            parentId: result.parent.id,
            block: deepClone(result.parent.blocks[result.index]),
            index: result.index,
          };
          result.parent.blocks.splice(result.index, 1);
          result.parent.blocks = renumberBlocks(result.parent.blocks);
          return next;
        }
        // Search children
        const childResult = _findBlockParentRecursive(page, blockId);
        if (childResult) {
          snapshot = {
            parentId: childResult.parent.id,
            block: deepClone(childResult.parent.blocks[childResult.index]),
            index: childResult.index,
          };
          childResult.parent.blocks.splice(childResult.index, 1);
          childResult.parent.blocks = renumberBlocks(childResult.parent.blocks);
          return next;
        }
      }
      return next;
    },
    undo: (state: FormTemplate): FormTemplate => {
      if (!snapshot) return state;
      const next = deepClone(state);
      for (const page of next.pages) {
        const container = findContainer(page, snapshot.parentId);
        if (container) {
          container.blocks.splice(snapshot.index, 0, snapshot.block);
          container.blocks = renumberBlocks(container.blocks);
          return next;
        }
        const found = searchAllContainers(page.children, snapshot.parentId);
        if (found) {
          found.blocks.splice(snapshot.index, 0, snapshot.block);
          found.blocks = renumberBlocks(found.blocks);
          return next;
        }
      }
      return next;
    },
  };
}

function _findBlockParentRecursive(container: Container, blockId: string): { parent: Container; index: number } | null {
  const direct = findBlockParent(container, blockId);
  if (direct) return direct;
  for (const child of container.children) {
    const result = _findBlockParentRecursive(child, blockId);
    if (result) return result;
  }
  return null;
}

export function createMoveBlockCommand(
  blockId: string,
  _fromContainerId: string,
  toContainerId: string,
  toIndex: number,
): Command {
  let fromSnapshot: { parentId: string; index: number; block: BlockInstance } | null = null;

  return {
    type: 'MOVE_BLOCK',
    timestamp: Date.now(),
    description: 'Move block',
    execute: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      // Find the block and remove from source
      for (const page of next.pages) {
        const result = _findBlockParentRecursive(page, blockId);
        if (result) {
          fromSnapshot = {
            parentId: result.parent.id,
            index: result.index,
            block: deepClone(result.parent.blocks[result.index]),
          };
          result.parent.blocks.splice(result.index, 1);
          result.parent.blocks = renumberBlocks(result.parent.blocks);
          break;
        }
      }
      if (!fromSnapshot) return state;
      // Insert into target
      for (const page of next.pages) {
        const targetContainer = findContainer(page, toContainerId);
        if (targetContainer) {
          const insertIdx = Math.min(toIndex, targetContainer.blocks.length);
          targetContainer.blocks.splice(insertIdx, 0, fromSnapshot.block);
          targetContainer.blocks = renumberBlocks(targetContainer.blocks);
          return next;
        }
        const found = searchAllContainers(page.children, toContainerId);
        if (found) {
          const insertIdx = Math.min(toIndex, found.blocks.length);
          found.blocks.splice(insertIdx, 0, fromSnapshot.block);
          found.blocks = renumberBlocks(found.blocks);
          return next;
        }
      }
      return next;
    },
    undo: (state: FormTemplate): FormTemplate => {
      if (!fromSnapshot) return state;
      const next = deepClone(state);
      // Remove from where it was moved to
      for (const page of next.pages) {
        const result = _findBlockParentRecursive(page, blockId);
        if (result) {
          result.parent.blocks.splice(result.index, 1);
          result.parent.blocks = renumberBlocks(result.parent.blocks);
          break;
        }
      }
      // Restore to original location
      for (const page of next.pages) {
        const container = findContainer(page, fromSnapshot.parentId);
        if (container) {
          container.blocks.splice(fromSnapshot.index, 0, fromSnapshot.block);
          container.blocks = renumberBlocks(container.blocks);
          return next;
        }
        const found = searchAllContainers(page.children, fromSnapshot.parentId);
        if (found) {
          found.blocks.splice(fromSnapshot.index, 0, fromSnapshot.block);
          found.blocks = renumberBlocks(found.blocks);
          return next;
        }
      }
      return next;
    },
  };
}

export function createAddContainerCommand(
  parentContainerId: string,
  type: 'section' | 'group',
): Command {
  const newContainerId = generateId(type);
  const newContainer: Container = {
    id: newContainerId,
    type,
    title: type === 'section' ? 'New Section' : 'New Group',
    sortOrder: 0,
    children: [],
    blocks: [],
  };

  return {
    type: 'ADD_CONTAINER',
    timestamp: Date.now(),
    description: `Add ${type}`,
    execute: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      for (const page of next.pages) {
        if (page.id === parentContainerId) {
          page.children.push(newContainer);
          page.children = renumberContainers(page.children);
          return next;
        }
        const container = findContainer(page, parentContainerId);
        if (container) {
          container.children.push(newContainer);
          container.children = renumberContainers(container.children);
          return next;
        }
      }
      return next;
    },
    undo: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      for (const page of next.pages) {
        const result = findParentContainer(page, newContainerId);
        if (result) {
          result.children = result.children.filter(c => c.id !== newContainerId);
          result.children = renumberContainers(result.children);
          return next;
        }
        if (page.id === parentContainerId) {
          page.children = page.children.filter(c => c.id !== newContainerId);
          page.children = renumberContainers(page.children);
          return next;
        }
      }
      return next;
    },
  };
}

export function createDeleteContainerCommand(containerId: string): Command {
  let snapshot: { parentId: string; container: Container; index: number } | null = null;

  return {
    type: 'DELETE_CONTAINER',
    timestamp: Date.now(),
    description: 'Delete container',
    execute: (state: FormTemplate): FormTemplate => {
      const next = deepClone(state);
      for (const page of next.pages) {
        if (page.id === containerId) return state; // can't delete page in spike
        const parent = findParentContainer(page, containerId);
        if (parent) {
          const idx = parent.children.findIndex(c => c.id === containerId);
          if (idx !== -1) {
            snapshot = { parentId: parent.id, container: deepClone(parent.children[idx]), index: idx };
            parent.children.splice(idx, 1);
            parent.children = renumberContainers(parent.children);
            return next;
          }
        }
      }
      return next;
    },
    undo: (state: FormTemplate): FormTemplate => {
      if (!snapshot) return state;
      const next = deepClone(state);
      for (const page of next.pages) {
        const parent = findContainer(page, snapshot.parentId);
        if (parent) {
          parent.children.splice(snapshot.index, 0, snapshot.container);
          parent.children = renumberContainers(parent.children);
          return next;
        }
      }
      return next;
    },
  };
}

// ---- Ordering strategy implementations (for comparison) ------------------

/** Integer ordering: renumber all items after every move. */
export function integerReorder<T extends { sortOrder: number }>(
  items: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result.map((item, i) => ({ ...item, sortOrder: i }));
}

/** Fractional ordering: compute midpoint between neighbors. */
export function fractionalInsert(
  items: { sortOrder: number }[],
  beforeIndex: number | null,
  afterIndex: number | null,
): number {
  const before = beforeIndex !== null && beforeIndex >= 0 ? items[beforeIndex]?.sortOrder : 0;
  const after = afterIndex !== null && afterIndex < items.length ? items[afterIndex]?.sortOrder : (before ?? 0) + 2;

  if (before === undefined || after === undefined) {
    const max = items.reduce((m, i) => Math.max(m, i.sortOrder), 0);
    return max + 1;
  }
  return (before + after) / 2;
}

/** Simple LexoRank-style key generation. */
const LEXO_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

export function lexoMid(prev: string, next: string): string {
  let result = '';
  const maxLen = Math.max(prev.length, next.length);
  for (let i = 0; i < maxLen; i++) {
    const p = i < prev.length ? LEXO_CHARS.indexOf(prev[i]) : 0;
    const n = i < next.length ? LEXO_CHARS.indexOf(next[i]) : LEXO_CHARS.length - 1;
    const mid = Math.floor((p + n) / 2);
    result += LEXO_CHARS[mid];
    if (mid > p && mid < n) break;
  }
  // If we didn't break, we need to extend
  if (result === prev || result === next) {
    result += LEXO_CHARS[Math.floor(LEXO_CHARS.length / 2)];
  }
  return result;
}

export function lexoInsert(
  items: { sortKey?: string }[],
  beforeIndex: number | null,
  afterIndex: number | null,
): string {
  const prev = beforeIndex !== null && beforeIndex >= 0 ? (items[beforeIndex]?.sortKey || '0') : '0';
  const next = afterIndex !== null && afterIndex < items.length ? (items[afterIndex]?.sortKey || 'z') : 'z';
  return lexoMid(prev, next);
}

// ---- Active page / section tracking ---------------------------------------

export interface BuilderUIState {
  activePageId: string | null;
  activeSectionId: string | null;
  selectedBlockId: string | null;
  selectedContainerId: string | null;
}
