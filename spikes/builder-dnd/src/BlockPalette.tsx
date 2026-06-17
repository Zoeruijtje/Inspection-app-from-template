// Phase 3A0-A — Block Palette (left panel)

import { useState, useCallback } from 'react';
import { BLOCK_CATALOGUE, CATEGORY_LABELS, CATEGORY_ORDER } from './blockCatalogue';
import type { BlockTypeDef } from './types';
import { useBuilder } from './BuilderContext';

export function BlockPalette() {
  const { state, dispatch } = useBuilder();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = search.trim()
    ? BLOCK_CATALOGUE.filter(
        b =>
          b.label.toLowerCase().includes(search.toLowerCase()) ||
          b.description.toLowerCase().includes(search.toLowerCase()) ||
          b.id.toLowerCase().includes(search.toLowerCase()),
      )
    : BLOCK_CATALOGUE;

  const grouped: Record<string, BlockTypeDef[]> = {};
  for (const cat of CATEGORY_ORDER) {
    const items = filtered.filter(b => b.category === cat);
    if (items.length > 0) grouped[cat] = items;
  }

  const activeSectionId = state.ui.activeSectionId;
  const pageId = state.ui.activePageId;
  const activePage = state.template.pages.find(p => p.id === pageId);

  // Prefer selected container if it's a section or group, else active section, else page
  let targetContainerId = activeSectionId || activePage?.id || '';
  if (state.ui.selectedContainerId) {
    // Check if selected container is a section or group (not a page)
    const selectedIsPage = state.template.pages.some(p => p.id === state.ui.selectedContainerId);
    if (!selectedIsPage) {
      targetContainerId = state.ui.selectedContainerId;
    }
  }

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleAddBlock = useCallback(
    (blockTypeId: string) => {
      if (!targetContainerId) return;
      dispatch({
        type: 'ADD_BLOCK',
        containerId: targetContainerId,
        blockTypeId,
        position: 'end',
      });
    },
    [dispatch, targetContainerId],
  );

  // Drag from palette
  const handleDragStart = useCallback(
    (e: React.DragEvent, blockTypeId: string) => {
      e.dataTransfer.setData('application/x-block-type', blockTypeId);
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  return (
    <div className="palette" role="region" aria-label="Block palette">
      <h2 className="palette-title">Block Palette</h2>
      <input
        type="search"
        className="palette-search"
        placeholder="Search blocks..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search block types"
      />
      <div className="palette-categories">
        {Object.entries(grouped).map(([cat, blocks]) => (
          <div key={cat} className="palette-category">
            <button
              className="palette-category-header"
              onClick={() => toggleCategory(cat)}
              aria-expanded={!collapsed.has(cat)}
            >
              <span className="category-chevron">{collapsed.has(cat) ? '▶' : '▼'}</span>
              <span className="category-label">{CATEGORY_LABELS[cat] || cat}</span>
              <span className="category-count">{blocks.length}</span>
            </button>
            {!collapsed.has(cat) && (
              <div className="palette-blocks">
                {blocks.map(block => (
                  <div
                    key={block.id}
                    className="palette-block-card"
                    draggable
                    onDragStart={e => handleDragStart(e, block.id)}
                    onClick={() => handleAddBlock(block.id)}
                    title={block.description}
                    role="button"
                    tabIndex={0}
                    aria-label={`Add ${block.label}`}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAddBlock(block.id);
                      }
                    }}
                  >
                    <span className="palette-block-icon">{block.icon}</span>
                    <span className="palette-block-label">{block.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
