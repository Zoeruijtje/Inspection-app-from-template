// Phase 3A0-A Builder DnD Spike — Type Definitions

// ---- Block Catalogue ------------------------------------------------------

export type BlockCategory =
  | 'structure'
  | 'display'
  | 'basic_inputs'
  | 'choice_inputs'
  | 'data_calculation'
  | 'media'
  | 'inspection_workflow'
  | 'advanced';

export interface BlockTypeDef {
  id: string;          // e.g. 'short_text'
  label: string;       // e.g. 'Short Text'
  category: BlockCategory;
  icon: string;        // emoji for simplicity in spike
  description: string;
}

// ---- Block instance in the canvas -----------------------------------------

export interface BlockInstance {
  id: string;          // unique instance id
  blockTypeId: string; // references BlockTypeDef.id
  label: string;       // user-editable label
  sortOrder: number;   // ordering within parent container
  config: Record<string, unknown>; // type-specific config (spike: minimal)
}

// ---- Containers -----------------------------------------------------------

export type ContainerType = 'page' | 'section' | 'group';

export interface Container {
  id: string;
  type: ContainerType;
  title: string;
  sortOrder: number;
  children: Container[];   // nested containers (sections in pages, groups in sections)
  blocks: BlockInstance[];  // direct block children
  collapsed?: boolean;     // builder-only visual state
}

export interface FormTemplate {
  id: string;
  name: string;
  pages: Container[];  // top-level containers of type 'page'
}

// ---- Undo / Redo commands -------------------------------------------------

export type CommandType =
  | 'ADD_BLOCK'
  | 'DELETE_BLOCK'
  | 'MOVE_BLOCK'
  | 'ADD_CONTAINER'
  | 'DELETE_CONTAINER'
  | 'MOVE_CONTAINER'
  | 'UPDATE_BLOCK_CONFIG'
  | 'REORDER_BLOCKS';

export interface Command {
  type: CommandType;
  timestamp: number;
  execute: (state: FormTemplate) => FormTemplate;
  undo: (state: FormTemplate) => FormTemplate;
  description: string;
}

// ---- Save state -----------------------------------------------------------

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'failed';

// ---- Ordering strategy (for comparison) -----------------------------------

export type OrderingStrategy = 'integer' | 'fractional' | 'lexorank';
