// Phase 3A0-A — Properties Panel (right panel, minimal)

import { useBuilder } from './BuilderContext';
import { BLOCK_CATALOGUE } from './blockCatalogue';

export function PropertiesPanel() {
  const { state } = useBuilder();
  const { selectedBlockId, selectedContainerId } = state.ui;

  // Find selected block
  let selectedBlock: { id: string; label: string; blockTypeId: string } | null = null;
  let parentContainerId: string | null = null;

  if (selectedBlockId) {
    for (const page of state.template.pages) {
      const found = findBlockInTree(page, selectedBlockId);
      if (found) {
        selectedBlock = found.block;
        parentContainerId = found.parentId;
        break;
      }
    }
  }

  // Find selected container
  let selectedContainer: { id: string; type: string; title: string } | null = null;
  if (selectedContainerId) {
    for (const page of state.template.pages) {
      const found = findContainerInTree(page, selectedContainerId);
      if (found) {
        selectedContainer = found;
        break;
      }
    }
  }

  const blockDef = selectedBlock
    ? BLOCK_CATALOGUE.find(b => b.id === selectedBlock.blockTypeId)
    : null;

  return (
    <div className="properties-panel" role="region" aria-label="Properties panel">
      <h2 className="properties-title">Properties</h2>

      {!selectedBlock && !selectedContainer && (
        <div className="properties-empty">
          <p>Select a block or container to view its properties.</p>
        </div>
      )}

      {selectedBlock && (
        <div className="properties-section">
          <h3>Block</h3>
          <div className="properties-field">
            <label>Type</label>
            <span>{blockDef?.label || selectedBlock.blockTypeId}</span>
          </div>
          <div className="properties-field">
            <label>Label</label>
            <span>{selectedBlock.label}</span>
          </div>
          <div className="properties-field">
            <label>Block ID</label>
            <code>{selectedBlock.id}</code>
          </div>
          <div className="properties-field">
            <label>Parent Container</label>
            <code>{parentContainerId || 'N/A'}</code>
          </div>
          <div className="properties-field">
            <label>Icon</label>
            <span>{blockDef?.icon || '📋'}</span>
          </div>
          <div className="properties-field">
            <label>Description</label>
            <span>{blockDef?.description || '—'}</span>
          </div>
        </div>
      )}

      {selectedContainer && (
        <div className="properties-section">
          <h3>Container</h3>
          <div className="properties-field">
            <label>Type</label>
            <span>{selectedContainer.type}</span>
          </div>
          <div className="properties-field">
            <label>Title</label>
            <span>{selectedContainer.title}</span>
          </div>
          <div className="properties-field">
            <label>Container ID</label>
            <code>{selectedContainer.id}</code>
          </div>
        </div>
      )}

      {/* Keyboard shortcut help */}
      <div className="properties-section properties-shortcuts">
        <h3>Keyboard Shortcuts</h3>
        <div className="shortcut-item"><kbd>Ctrl+Z</kbd> Undo</div>
        <div className="shortcut-item"><kbd>Ctrl+Shift+Z</kbd> Redo</div>
        <div className="shortcut-item"><kbd>Esc</kbd> Deselect</div>
        <div className="shortcut-item"><kbd>Tab</kbd> Next control</div>
        <div className="shortcut-item"><kbd>↑↓</kbd> Move selected</div>
      </div>
    </div>
  );
}

// ---- Helpers --------------------------------------------------------------

function findBlockInTree(
  container: { id: string; children: { id: string; blocks: { id: string; label: string; blockTypeId: string }[]; children: any[] }[]; blocks: { id: string; label: string; blockTypeId: string }[] },
  blockId: string,
): { block: { id: string; label: string; blockTypeId: string }; parentId: string } | null {
  const idx = container.blocks.findIndex(b => b.id === blockId);
  if (idx !== -1) return { block: container.blocks[idx], parentId: container.id };
  for (const child of container.children) {
    const found = findBlockInTree(child, blockId);
    if (found) return found;
  }
  return null;
}

function findContainerInTree(
  container: { id: string; type: string; title: string; children: any[] },
  containerId: string,
): { id: string; type: string; title: string } | null {
  if (container.id === containerId) return container;
  for (const child of container.children) {
    const found = findContainerInTree(child, containerId);
    if (found) return found;
  }
  return null;
}
