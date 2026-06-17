// Phase 3A0-A v3 — Correct dnd-kit event model, cross-container keyboard, Move-to button, Escape restore

import React, { useCallback, useRef, useState, useEffect, createContext, useContext } from 'react';
import {
  DragDropProvider,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useDragOperation,
} from '@dnd-kit/react';
import { useBuilder } from './BuilderContext';
import { BLOCK_CATALOGUE } from './blockCatalogue';
import type { BlockInstance, Command, Container, FormTemplate, SaveStatus } from './types';

// ---- Types for lift state ------------------------------------------------
interface KeyboardLiftState {
  blockId: string;
  containerId: string;
  originalIndex: number;
  preLiftSnapshot: string | null; // Spike-only JSON snapshot for Escape restore.
  preLiftUndoStack: Command[];
  preLiftRedoStack: Command[];
  preLiftSaveStatus: SaveStatus;
}

// ---- Contexts ------------------------------------------------------------
interface InsertionState { containerId: string | null; index: number; }
const InsertionContext = createContext<InsertionState>({ containerId: null, index: -1 });

interface DragActiveContextValue { isDragActive: boolean; }
const DragActiveContext = createContext<DragActiveContextValue>({ isDragActive: false });

// ---- Auto-scroll hook ----------------------------------------------------
function useAutoScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { isDragActive } = useContext(DragActiveContext);
  const lastPointerYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDragActive) {
      lastPointerYRef.current = null;
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastPointerYRef.current = event.clientY;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      lastPointerYRef.current = null;
    };
  }, [isDragActive]);

  useEffect(() => {
    if (!isDragActive) return;
    const raf: { current: number } = { current: 0 };
    const step = () => {
      const pointerY = lastPointerYRef.current;
      if (!pointerY || !containerRef.current) { raf.current = requestAnimationFrame(step); return; }
      const rect = containerRef.current.getBoundingClientRect();
      const threshold = 60, maxSpeed = 15;
      const distTop = pointerY - rect.top;
      const distBot = rect.bottom - pointerY;
      if (distTop > 0 && distTop < threshold) {
        containerRef.current.scrollBy({ top: -((threshold - distTop) / threshold) * maxSpeed });
      } else if (distBot > 0 && distBot < threshold) {
        containerRef.current.scrollBy({ top: ((threshold - distBot) / threshold) * maxSpeed });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [isDragActive, containerRef]);
}

// ---- Block Card ----------------------------------------------------------
interface BlockCardProps {
  block: BlockInstance; containerId: string; index: number; totalInContainer: number;
  isSelected: boolean; isKeyboardLifted: boolean;
  onSelect: (id: string) => void; onMoveUp: () => void; onMoveDown: () => void;
  onDelete: () => void; onKeyboardLift: (blockId: string) => void;
  onKeyboardDrop: (blockId: string) => void; onKeyboardCancel: (blockId: string) => void;
  onMoveToClick: (blockId: string) => void;
}

function BlockCard({ block, containerId, index, totalInContainer, isSelected, isKeyboardLifted,
  onSelect, onMoveUp, onMoveDown, onDelete, onKeyboardLift, onKeyboardDrop, onKeyboardCancel, onMoveToClick }: BlockCardProps) {
  const def = BLOCK_CATALOGUE.find(b => b.id === block.blockTypeId);
  const lifted = isKeyboardLifted;

  const { ref: draggableRef, handleRef, isDragging } = useDraggable({
    id: block.id,
    data: { type: 'canvas-block', blockId: block.id, containerId, blockTypeId: block.blockTypeId },
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (lifted) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onKeyboardCancel(block.id); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onKeyboardDrop(block.id); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); onMoveUp(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); onMoveDown(); return; }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && !lifted) {
      e.preventDefault(); e.stopPropagation();
      onKeyboardLift(block.id);
    }
  }, [lifted, block.id, onKeyboardLift, onKeyboardDrop, onKeyboardCancel, onMoveUp, onMoveDown]);

  return (
    <div ref={draggableRef}
      className={`block-card ${isSelected ? 'block-card-selected' : ''} ${isDragging ? 'block-card-dragging' : ''} ${lifted ? 'block-card-lifted' : ''}`}
      onClick={() => onSelect(block.id)} onKeyDown={handleKeyDown} tabIndex={0}
      data-block-id={block.id}
      data-container-id={containerId}
      data-block-index={index}
      role="listitem" aria-label={`${def?.label || block.blockTypeId}: ${block.label}${lifted ? ' — lifted, arrow keys to move, Enter to drop, Escape to cancel' : ''}`}
      aria-selected={isSelected} aria-grabbed={lifted}>
      <span ref={handleRef} className="block-drag-handle" title="Drag to reorder (dnd-kit)" aria-label="Drag handle" tabIndex={-1}>⠿</span>
      <span className="block-icon">{def?.icon || '📋'}</span>
      <span className="block-label">{block.label}</span>
      <span className="block-type-badge">{def?.label || block.blockTypeId}</span>
      <div className="block-actions" role="group" aria-label="Block actions">
        <button className="block-action-btn" disabled={index === 0} onClick={e => { e.stopPropagation(); onMoveUp(); }} title="Move up (button fallback)" aria-label="Move block up">↑</button>
        <button className="block-action-btn" disabled={index === totalInContainer - 1} onClick={e => { e.stopPropagation(); onMoveDown(); }} title="Move down (button fallback)" aria-label="Move block down">↓</button>
        <button className="block-action-btn" onClick={e => { e.stopPropagation(); onMoveToClick(block.id); }} title="Move to another container" aria-label="Move to...">↗</button>
        <button className="block-action-btn block-action-delete" onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete block" aria-label="Delete block">✕</button>
      </div>
    </div>
  );
}

// ---- Insertion Indicator -------------------------------------------------
function InsertionIndicator({ containerId, index }: { containerId: string; index: number }) {
  const ins = useContext(InsertionContext);
  const active = ins.containerId === containerId && ins.index === index;
  return <div className={`insertion-indicator ${active ? 'insertion-indicator-active' : ''}`} aria-hidden="true" />;
}

// ---- Drop Slot -----------------------------------------------------------
function DropSlot({ containerId, index, children }: { containerId: string; index: number; children: React.ReactNode }) {
  const { ref, isDropTarget } = useDroppable({
    id: `slot-${containerId}-${index}`,
    data: { type: 'drop-slot', containerId, index },
  });
  return <div ref={ref} className={`drop-slot ${isDropTarget ? 'drop-slot-active' : ''}`}>{children}</div>;
}

// ---- Move-to Modal -------------------------------------------------------
interface MoveToModalProps {
  blockId: string;
  containerId: string;
  template: { pages: Container[] };
  onMove: (blockId: string, toContainerId: string, toIndex: number) => void;
  onClose: () => void;
}

function MoveToModal({ blockId, containerId: fromContainerId, template, onMove, onClose }: MoveToModalProps) {
  const [selectedContainer, setSelectedContainer] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<number>(0);

  // Flatten all containers
  const containers: { id: string; title: string; type: string; blockCount: number }[] = [];
  function collectContainers(c: Container, depth: number) {
    if (c.type !== 'page') {
      containers.push({ id: c.id, title: c.title, type: c.type, blockCount: c.blocks.length });
    }
    for (const child of c.children) collectContainers(child, depth + 1);
  }
  for (const page of template.pages) collectContainers(page, 0);

  const target = containers.find(c => c.id === selectedContainer);
  const maxPos = target ? target.blockCount : 0;

  const handleMove = () => {
    if (selectedContainer && selectedContainer !== fromContainerId) {
      onMove(blockId, selectedContainer, Math.min(selectedPosition, maxPos));
    }
    onClose();
  };

  return (
    <div className="move-to-overlay" onClick={onClose} role="dialog" aria-label="Move block to another container">
      <div className="move-to-modal" onClick={e => e.stopPropagation()}>
        <h3>Move Block</h3>
        <div className="move-to-field">
          <label>Destination container:</label>
          <select value={selectedContainer} onChange={e => { setSelectedContainer(e.target.value); setSelectedPosition(0); }}>
            <option value="">— select —</option>
            {containers.filter(c => c.id !== fromContainerId).map(c => (
              <option key={c.id} value={c.id}>{c.title} ({c.type}, {c.blockCount} blocks)</option>
            ))}
          </select>
        </div>
        {selectedContainer && (
          <div className="move-to-field">
            <label>Position:</label>
            <select value={selectedPosition} onChange={e => setSelectedPosition(Number(e.target.value))}>
              <option value={0}>At start</option>
              {Array.from({ length: maxPos }, (_, i) => (
                <option key={i + 1} value={i + 1}>After position {i + 1}</option>
              ))}
            </select>
          </div>
        )}
        <div className="move-to-actions">
          <button className="toolbar-btn" onClick={handleMove} disabled={!selectedContainer}>Move</button>
          <button className="toolbar-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ---- Container View ------------------------------------------------------
interface ContainerViewProps {
  container: Container; depth: number;
  onSelectBlock: (id: string) => void; onSelectContainer: (id: string) => void;
  onKeyboardLift: (blockId: string) => void; onKeyboardDrop: (blockId: string) => void;
  onKeyboardCancel: (blockId: string) => void; onMoveToClick: (blockId: string) => void;
  selectedBlockId: string | null; selectedContainerId: string | null; keyboardLiftedBlockId: string | null;
  onMoveUp: (blockId: string) => void; onMoveDown: (blockId: string) => void;
}

function ContainerView({ container, depth, onSelectBlock, onSelectContainer,
  onKeyboardLift, onKeyboardDrop, onKeyboardCancel, onMoveToClick,
  selectedBlockId, selectedContainerId, keyboardLiftedBlockId, onMoveUp, onMoveDown }: ContainerViewProps) {
  const { dispatch } = useBuilder();
  const { ref: droppableRef, isDropTarget } = useDroppable({
    id: container.id, data: { type: 'container', containerId: container.id },
  });
  const isSelected = selectedContainerId === container.id;

  // Native HTML5 drag (palette → canvas only)
  const handleNativeDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-block-type')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }
  }, []);
  const handleNativeDrop = useCallback((e: React.DragEvent) => {
    const blockTypeId = e.dataTransfer.getData('application/x-block-type');
    if (!blockTypeId) return;
    e.preventDefault();
    dispatch({ type: 'ADD_BLOCK', containerId: container.id, blockTypeId, position: 'end' });
  }, [dispatch, container.id]);

  return (
    <div ref={droppableRef}
      className={`container-view ${isSelected ? 'container-selected' : ''} ${isDropTarget ? 'container-drop-target' : ''}`}
      style={{ borderColor: container.type === 'section' ? '#3b82f6' : '#8b5cf6', backgroundColor: container.type === 'section' ? '#eff6ff' : '#f5f3ff', marginLeft: depth * 16 }}
      onClick={e => { e.stopPropagation(); onSelectContainer(container.id); }}
      onDragOver={handleNativeDragOver} onDrop={handleNativeDrop}
      data-container-id={container.id}
      data-container-type={container.type}
      data-container-title={container.title}
      data-block-count={container.blocks.length}
      role="region" aria-label={`${container.type}: ${container.title}`}>
      <div className="container-header">
        <span className="container-type-icon">{container.type === 'section' ? '📦' : '📁'}</span>
        <span className="container-title">{container.title}</span>
        <span className="container-badge">{container.blocks.length} blocks</span>
        {container.type === 'section' && (
          <button className="container-action-btn" onClick={e => { e.stopPropagation(); dispatch({ type: 'ADD_GROUP', containerId: container.id }); }} title="Add group">+ Group</button>
        )}
        <div className="container-move-btns">
          <button className="container-action-btn" onClick={e => { e.stopPropagation(); dispatch({ type: 'MOVE_CONTAINER_UP', containerId: container.id }); }} title="Move up (button fallback)" aria-label="Move section up">↑</button>
          <button className="container-action-btn" onClick={e => { e.stopPropagation(); dispatch({ type: 'MOVE_CONTAINER_DOWN', containerId: container.id }); }} title="Move down (button fallback)" aria-label="Move section down">↓</button>
        </div>
      </div>
      <div className="container-blocks" role="list">
        {container.blocks.length === 0 && <div className="container-empty">Drop blocks here</div>}
        <DropSlot containerId={container.id} index={0}><InsertionIndicator containerId={container.id} index={0} /></DropSlot>
        {container.blocks.map((block, idx) => (
          <React.Fragment key={block.id}>
            <BlockCard block={block} containerId={container.id} index={idx} totalInContainer={container.blocks.length}
              isSelected={selectedBlockId === block.id} isKeyboardLifted={keyboardLiftedBlockId === block.id}
              onSelect={onSelectBlock}
              onMoveUp={() => onMoveUp(block.id)} onMoveDown={() => onMoveDown(block.id)}
              onDelete={() => dispatch({ type: 'DELETE_BLOCK', blockId: block.id })}
              onKeyboardLift={onKeyboardLift} onKeyboardDrop={onKeyboardDrop} onKeyboardCancel={onKeyboardCancel}
              onMoveToClick={onMoveToClick} />
            <DropSlot containerId={container.id} index={idx + 1}><InsertionIndicator containerId={container.id} index={idx + 1} /></DropSlot>
          </React.Fragment>
        ))}
      </div>
      {container.children.map(child => (
        <ContainerView key={child.id} container={child} depth={depth + 1}
          onSelectBlock={onSelectBlock} onSelectContainer={onSelectContainer}
          onKeyboardLift={onKeyboardLift} onKeyboardDrop={onKeyboardDrop} onKeyboardCancel={onKeyboardCancel}
          onMoveToClick={onMoveToClick}
          selectedBlockId={selectedBlockId} selectedContainerId={selectedContainerId}
          keyboardLiftedBlockId={keyboardLiftedBlockId} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />
      ))}
    </div>
  );
}

// ---- Page View -----------------------------------------------------------
function PageView({ page, ...props }: { page: Container } & Omit<ContainerViewProps, 'container' | 'depth'>) {
  const { dispatch } = useBuilder();
  return (
    <div className="page-view" role="region" aria-label={`Page: ${page.title}`}>
      {page.children.map(section => <ContainerView key={section.id} container={section} depth={0} {...props} />)}
      <button className="add-section-btn" onClick={() => dispatch({ type: 'ADD_SECTION', pageId: page.id })}>+ Add Section</button>
    </div>
  );
}

// ---- Canvas --------------------------------------------------------------
export function BuilderCanvas() {
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <DragActiveContext.Provider value={{ isDragActive }}>
      <BuilderCanvasInner setIsDragActive={setIsDragActive} />
    </DragActiveContext.Provider>
  );
}

function BuilderCanvasInner({ setIsDragActive }: { setIsDragActive: React.Dispatch<React.SetStateAction<boolean>> }) {
  const { state, dispatch } = useBuilder();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [insertion, setInsertion] = useState<InsertionState>({ containerId: null, index: -1 });
  const [kbLift, setKbLift] = useState<KeyboardLiftState | null>(null);
  const [moveToBlock, setMoveToBlock] = useState<{ blockId: string; containerId: string } | null>(null);

  const template = state.template;
  const activePageId = state.ui.activePageId;
  const activePage = template.pages.find(p => p.id === activePageId) || template.pages[0];

  useAutoScroll(canvasRef);

  // ---- Keyboard lift / drop / cancel ----
  const handleKbLift = useCallback((blockId: string) => {
    for (const page of template.pages) {
      const found = findBlockRecursive(page, blockId);
      if (found) {
        // Snapshot the entire template for Escape restoration
        setKbLift({
          blockId,
          containerId: found.container.id,
          originalIndex: found.index,
          preLiftSnapshot: JSON.stringify(template),
          preLiftUndoStack: state.undoStack,
          preLiftRedoStack: state.redoStack,
          preLiftSaveStatus: state.saveStatus,
        });
        return;
      }
    }
  }, [state.redoStack, state.saveStatus, state.undoStack, template]);

  const handleKbDrop = useCallback((_blockId: string) => {
    setKbLift(null);
  }, []);

  const handleKbCancel = useCallback((_blockId: string) => {
    // RESTORE pre-lift state from snapshot
    if (kbLift?.preLiftSnapshot) {
      const restored = JSON.parse(kbLift.preLiftSnapshot) as typeof template;
      dispatch({
        type: 'RESTORE_SNAPSHOT',
        template: restored,
        saveStatus: kbLift.preLiftSaveStatus,
        undoStack: kbLift.preLiftUndoStack,
        redoStack: kbLift.preLiftRedoStack,
      });
    }
    setKbLift(null);
  }, [kbLift, dispatch]);

  // ---- Move-to handler ----
  const handleMoveTo = useCallback((blockId: string, toContainerId: string, toIndex: number) => {
    // Find source container
    for (const page of template.pages) {
      const found = findBlockRecursive(page, blockId);
      if (found) {
        dispatch({ type: 'MOVE_BLOCK', blockId, fromContainerId: found.container.id, toContainerId, toIndex });
        break;
      }
    }
    setMoveToBlock(null);
  }, [template, dispatch]);

  // ---- Move up/down with cross-container ----
  const handleMoveUp = useCallback((blockId: string) => {
    for (const page of template.pages) {
      const found = findBlockRecursive(page, blockId);
      if (!found) continue;
      if (found.index > 0) {
        dispatch({ type: 'MOVE_BLOCK_UP', blockId });
        return;
      }
      const prevContainer = findPreviousVisibleCompatibleContainer(page, found.container.id);
      if (prevContainer) {
        dispatch({ type: 'MOVE_BLOCK', blockId, fromContainerId: found.container.id, toContainerId: prevContainer.id, toIndex: prevContainer.blocks.length });
        return;
      }
      return;
    }
  }, [dispatch, template]);

  const handleMoveDown = useCallback((blockId: string) => {
    for (const page of template.pages) {
      const found = findBlockRecursive(page, blockId);
      if (!found) continue;
      if (found.index < found.container.blocks.length - 1) {
        dispatch({ type: 'MOVE_BLOCK_DOWN', blockId });
        return;
      }
      const nextContainer = findNextVisibleCompatibleContainer(page, found.container.id);
      if (nextContainer) {
        dispatch({ type: 'MOVE_BLOCK', blockId, fromContainerId: found.container.id, toContainerId: nextContainer.id, toIndex: 0 });
        return;
      }
      return;
    }
  }, [dispatch, template]);
  // ---- Global keyboard shortcuts ----
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); dispatch({ type: e.shiftKey ? 'REDO' : 'UNDO' }); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); dispatch({ type: 'REDO' }); return; }
      if (e.key === 'Escape') {
        if (kbLift) { handleKbCancel(kbLift.blockId); return; }
        if (moveToBlock) { setMoveToBlock(null); return; }
        dispatch({ type: 'SET_SELECTED_BLOCK', blockId: null });
        dispatch({ type: 'SET_SELECTED_CONTAINER', containerId: null });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [dispatch, kbLift, moveToBlock, handleKbCancel]);

  // ---- Drag event handlers (passed to DragDropProvider) ----
  const handleDragStart = useCallback(() => {
    setIsDragActive(true);
  }, []);

  const handleDragOver = useCallback((event: any) => {
    const target = event.operation?.target;
    if (!target?.data) return;
    if (target.data.type === 'drop-slot') {
      setInsertion({ containerId: target.data.containerId as string, index: target.data.index as number });
    } else if (target.data.type === 'container') {
      const cid = target.data.containerId as string;
      for (const page of template.pages) {
        const c = findContainerById(page, cid);
        if (c) { setInsertion({ containerId: cid, index: c.blocks.length }); break; }
      }
    }
  }, [template]);

  const handleDragEnd = useCallback((event: any) => {
    setIsDragActive(false);
    setInsertion({ containerId: null, index: -1 });
    const source = event.operation?.source;
    const target = event.operation?.target;
    if (!source?.data || source.data.type !== 'canvas-block') return;
    const blockId = source.data.blockId as string;
    const fromCid = source.data.containerId as string;
    let toCid: string | null = null;
    let toIdx = -1;
    if (target?.data?.type === 'drop-slot') {
      toCid = target.data.containerId as string;
      toIdx = target.data.index as number;
    } else if (target?.data?.type === 'container') {
      toCid = target.data.containerId as string;
      for (const page of template.pages) {
        const c = findContainerById(page, toCid);
        if (c) { toIdx = c.blocks.length; break; }
      }
    }
    if (!toCid || toIdx < 0) return;
    if (fromCid === toCid) {
      for (const page of template.pages) {
        const found = findBlockRecursive(page, blockId);
        if (found) {
          const curIdx = found.index;
          const adjustedIdx = curIdx < toIdx ? toIdx - 1 : toIdx;
          if (curIdx !== adjustedIdx && adjustedIdx >= 0) {
            dispatch({ type: 'MOVE_BLOCK', blockId, fromContainerId: fromCid, toContainerId: toCid, toIndex: adjustedIdx });
          }
          break;
        }
      }
      return;
    }
    dispatch({ type: 'MOVE_BLOCK', blockId, fromContainerId: fromCid, toContainerId: toCid, toIndex: toIdx });
  }, [template, dispatch]);

  return (
    <DragDropProvider sensors={[PointerSensor, KeyboardSensor]}
      onDragStart={handleDragStart as any}
      onDragOver={handleDragOver as any}
      onDragEnd={handleDragEnd as any}>
      <InsertionContext.Provider value={insertion}>
        <div className="canvas" ref={canvasRef}>
          <div className="sr-only" role="status" aria-live="polite">
            {kbLift ? 'Block lifted. Use arrow keys to move, Enter to drop, Escape to cancel.' : ''}
          </div>
          <div className="page-tabs" role="tablist" aria-label="Pages">
            {template.pages.map(page => (
              <button key={page.id} className={`page-tab ${page.id === activePageId ? 'page-tab-active' : ''}`}
                role="tab" aria-selected={page.id === activePageId}
                onClick={() => dispatch({ type: 'SET_ACTIVE_PAGE', pageId: page.id })}>
                {page.title}{state.saveStatus === 'unsaved' && <span className="page-unsaved-dot">●</span>}
              </button>
            ))}
          </div>
          {activePage && (
            <PageView page={activePage}
              onSelectBlock={(id) => dispatch({ type: 'SET_SELECTED_BLOCK', blockId: id })}
              onSelectContainer={(id) => dispatch({ type: 'SET_SELECTED_CONTAINER', containerId: id })}
              onKeyboardLift={handleKbLift} onKeyboardDrop={handleKbDrop} onKeyboardCancel={handleKbCancel}
              onMoveToClick={(blockId) => {
                // Find container
                for (const p of template.pages) {
                  const f = findBlockRecursive(p, blockId);
                  if (f) { setMoveToBlock({ blockId, containerId: f.container.id }); break; }
                }
              }}
              selectedBlockId={state.ui.selectedBlockId} selectedContainerId={state.ui.selectedContainerId}
              keyboardLiftedBlockId={kbLift?.blockId || null}
              onMoveUp={handleMoveUp} onMoveDown={handleMoveDown} />
          )}
          {kbLift && (
            <div className="keyboard-drag-help">
              <kbd>↑↓</kbd> Move &nbsp; <kbd>Enter</kbd> Drop &nbsp; <kbd>Esc</kbd> Cancel
            </div>
          )}
        </div>
        <CanvasDragOverlay template={template} />
        {/* Move-to modal */}
        {moveToBlock && (
          <MoveToModal
            blockId={moveToBlock.blockId}
            containerId={moveToBlock.containerId}
            template={template}
            onMove={handleMoveTo}
            onClose={() => setMoveToBlock(null)}
          />
        )}
      </InsertionContext.Provider>
    </DragDropProvider>
  );
}

function CanvasDragOverlay({ template }: { template: FormTemplate }) {
  const operation = useDragOperation();
  const draggedBlock = (() => {
    const sid = operation.source?.id as string | undefined;
    if (!sid) return null;
    for (const page of template.pages) {
      const found = findBlockRecursive(page, sid);
      if (found) return found.block;
    }
    return null;
  })();

  return (
    <DragOverlay>
      {draggedBlock ? (
        <div className="drag-overlay-content">
          <span className="block-icon">{BLOCK_CATALOGUE.find(b => b.id === draggedBlock.blockTypeId)?.icon || '📋'}</span>
          <span>{draggedBlock.label}</span>
        </div>
      ) : null}
    </DragOverlay>
  );
}

// ---- Tree helpers ----
function findBlockRecursive(c: Container, blockId: string): { container: Container; block: BlockInstance; index: number } | null {
  const idx = c.blocks.findIndex(b => b.id === blockId);
  if (idx !== -1) return { container: c, block: c.blocks[idx], index: idx };
  for (const child of c.children) { const f = findBlockRecursive(child, blockId); if (f) return f; }
  return null;
}
function findContainerById(root: Container, id: string): Container | null {
  if (root.id === id) return root;
  for (const child of root.children) { const f = findContainerById(child, id); if (f) return f; }
  return null;
}
/**
 * Keyboard container-navigation policy:
 * Arrow boundary movement targets the previous/next visible compatible container
 * in depth-first page order. Compatible containers are sections and groups. This
 * intentionally includes parent/child transitions for adjacent visible containers;
 * non-adjacent jumps should use the Move-to dialog.
 */
function findPreviousVisibleCompatibleContainer(root: Container, childId: string): Container | null {
  const flat = flattenContainers(root);
  const idx = flat.findIndex(c => c.id === childId);
  if (idx > 0) return flat[idx - 1];
  return null;
}
function findNextVisibleCompatibleContainer(root: Container, childId: string): Container | null {
  const flat = flattenContainers(root);
  const idx = flat.findIndex(c => c.id === childId);
  if (idx >= 0 && idx < flat.length - 1) return flat[idx + 1];
  return null;
}
function flattenContainers(c: Container): Container[] {
  const result: Container[] = [];
  if (c.type !== 'page') result.push(c);
  for (const child of c.children) result.push(...flattenContainers(child));
  return result;
}
