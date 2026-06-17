// Phase 3A0-A v5 — Stage A sortable rewrite.
//
// This intentionally replaces the v4 custom drop-slot pointer algorithm with
// the current @dnd-kit/react sortable primitives and @dnd-kit/helpers move().

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
} from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { PointerActivationConstraints } from '@dnd-kit/dom';
import { move } from '@dnd-kit/helpers';

type SectionId = 'section-a' | 'section-b';

interface StageBlock {
  id: string;
  label: string;
  kind: string;
}

interface StageSection {
  id: SectionId;
  title: string;
  note: string;
}

type SortableItems = Record<SectionId, string[]>;

const SECTIONS: StageSection[] = [
  { id: 'section-a', title: 'Section A', note: 'Starts with 5 blocks' },
  { id: 'section-b', title: 'Section B', note: 'Starts with 3 blocks' },
];

const BLOCKS: Record<string, StageBlock> = {
  'a-1': { id: 'a-1', label: 'Client name', kind: 'Short Text' },
  'a-2': { id: 'a-2', label: 'Inspection heading', kind: 'Heading' },
  'a-3': { id: 'a-3', label: 'General notes', kind: 'Long Text' },
  'a-4': { id: 'a-4', label: 'Condition rating', kind: 'Rating' },
  'a-5': { id: 'a-5', label: 'Required photo', kind: 'Single Photo' },
  'b-1': { id: 'b-1', label: 'Finding title', kind: 'Finding' },
  'b-2': { id: 'b-2', label: 'Recommendation', kind: 'Recommendation' },
  'b-3': { id: 'b-3', label: 'Inspector approval', kind: 'Approval' },
};

const INITIAL_ITEMS: SortableItems = {
  'section-a': ['a-1', 'a-2', 'a-3', 'a-4', 'a-5'],
  'section-b': ['b-1', 'b-2', 'b-3'],
};

const pointerSensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 6 }),
    ],
  }),
  KeyboardSensor,
];

function cloneItems(items: SortableItems): SortableItems {
  return {
    'section-a': [...items['section-a']],
    'section-b': [...items['section-b']],
  };
}

function sameItems(a: SortableItems, b: SortableItems): boolean {
  return (
    a['section-a'].join('|') === b['section-a'].join('|') &&
    a['section-b'].join('|') === b['section-b'].join('|')
  );
}

function findBlockSection(items: SortableItems, blockId: string): SectionId | null {
  for (const section of SECTIONS) {
    if (items[section.id].includes(blockId)) return section.id;
  }
  return null;
}

export function BuilderCanvas() {
  const [items, setItems] = useState<SortableItems>(() => cloneItems(INITIAL_ITEMS));
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState('No drag yet');
  const preDragItemsRef = useRef<SortableItems | null>(null);

  const orderedBlocks = useMemo(() => {
    return Object.fromEntries(
      SECTIONS.map(section => [
        section.id,
        items[section.id].map(blockId => BLOCKS[blockId]).filter(Boolean),
      ]),
    ) as Record<SectionId, StageBlock[]>;
  }, [items]);

  const handleDragStart = useCallback((event: any) => {
    preDragItemsRef.current = cloneItems(items);
    setActiveBlockId(String(event.operation.source?.id ?? ''));
    setLastMove('Dragging...');
  }, [items]);

  const handleDragOver = useCallback((event: any) => {
    setItems(current => {
      const next = move(current, event) as SortableItems;
      return sameItems(current, next) ? current : cloneItems(next);
    });
  }, []);

  const handleDragEnd = useCallback((event: any) => {
    if (event.operation.canceled) {
      if (preDragItemsRef.current) {
        setItems(cloneItems(preDragItemsRef.current));
      }
      setLastMove('Canceled: restored pre-drag state');
    } else {
      setItems(current => {
        const next = move(current, event) as SortableItems;
        return sameItems(current, next) ? current : cloneItems(next);
      });
      const sourceId = String(event.operation.source?.id ?? '');
      const section = sourceId ? findBlockSection(items, sourceId) : null;
      setLastMove(section ? `Dropped ${sourceId} in ${section}` : 'Dropped');
    }
    setActiveBlockId(null);
    preDragItemsRef.current = null;
  }, [items]);

  const resetStage = useCallback(() => {
    setItems(cloneItems(INITIAL_ITEMS));
    setActiveBlockId(null);
    setLastMove('Reset to Stage A seed data');
    preDragItemsRef.current = null;
  }, []);

  const activeBlock = activeBlockId ? BLOCKS[activeBlockId] : null;

  return (
    <DragDropProvider
      sensors={pointerSensors}
      onDragStart={handleDragStart as any}
      onDragOver={handleDragOver as any}
      onDragEnd={handleDragEnd as any}
    >
      <main className="v5-shell" aria-label="Phase 3A0-A v5 sortable builder spike">
        <header className="v5-toolbar">
          <div>
            <p className="v5-kicker">Phase 3A0-A v5</p>
            <h1>Stage A sortable lists</h1>
          </div>
          <button className="v5-button" type="button" onClick={resetStage}>
            Reset Stage A
          </button>
        </header>

        <section className="v5-status" aria-live="polite">
          <strong>Pointer core:</strong> official `useSortable` items, section `useDroppable` targets,
          and `move(items, event)` in `onDragOver`. {lastMove}.
        </section>

        <div className="v5-board">
          {SECTIONS.map(section => (
            <SortableSection
              key={section.id}
              section={section}
              blocks={orderedBlocks[section.id]}
            />
          ))}
        </div>

        <section className="v5-checklist" aria-label="Manual Stage A checklist">
          <h2>Manual 10-attempt checklist</h2>
          <ul>
            <li>Reorder within Section A.</li>
            <li>Reorder within Section B.</li>
            <li>Move A to B and B to A.</li>
            <li>Insert at first, middle, and last position.</li>
            <li>Move all blocks out of a section, then drop into the empty section.</li>
          </ul>
        </section>
      </main>

      <DragOverlay>
        {activeBlock ? <DragPreview block={activeBlock} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}

function SortableSection({ section, blocks }: { section: StageSection; blocks: StageBlock[] }) {
  const { ref, isDropTarget } = useDroppable({
    id: section.id,
    type: 'stage-section',
    accept: 'stage-block',
    collisionPriority: 1,
    data: { sectionId: section.id, kind: 'section-container' },
  });

  return (
    <section
      ref={ref}
      className={`v5-section ${isDropTarget ? 'v5-section-target' : ''}`}
      data-section-id={section.id}
      data-block-count={blocks.length}
      aria-label={`${section.title}, ${blocks.length} blocks`}
    >
      <div className="v5-section-header">
        <div>
          <h2>{section.title}</h2>
          <p>{section.note}</p>
        </div>
        <span className="v5-count">{blocks.length}</span>
      </div>

      <div className="v5-list" role="list">
        {blocks.length === 0 ? (
          <div className="v5-empty">Drop here when this section is empty</div>
        ) : (
          blocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              sectionId={section.id}
              index={index}
            />
          ))
        )}
      </div>
    </section>
  );
}

function SortableBlock({
  block,
  sectionId,
  index,
}: {
  block: StageBlock;
  sectionId: SectionId;
  index: number;
}) {
  const { ref, isDragging, isDragSource, isDropTarget } = useSortable({
    id: block.id,
    type: 'stage-block',
    accept: 'stage-block',
    group: sectionId,
    index,
    collisionPriority: 3,
    data: {
      blockId: block.id,
      sectionId,
      kind: 'block-item',
    },
  });

  return (
    <article
      ref={ref}
      className={[
        'v5-card',
        isDragging ? 'v5-card-dragging' : '',
        isDragSource ? 'v5-card-source' : '',
        isDropTarget ? 'v5-card-target' : '',
      ].filter(Boolean).join(' ')}
      data-block-id={block.id}
      data-section-id={sectionId}
      data-block-index={index}
      role="listitem"
      tabIndex={0}
      aria-label={`${block.label}, ${block.kind}, position ${index + 1}`}
    >
      <span className="v5-grip" aria-hidden="true">::</span>
      <span className="v5-card-main">
        <strong>{block.label}</strong>
        <small>{block.kind}</small>
      </span>
      <span className="v5-index">{index + 1}</span>
    </article>
  );
}

function DragPreview({ block }: { block: StageBlock }) {
  return (
    <div className="v5-preview">
      <strong>{block.label}</strong>
      <span>{block.kind}</span>
    </div>
  );
}
