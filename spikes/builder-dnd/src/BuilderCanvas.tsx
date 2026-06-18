// Phase 3A0-A v5 — Stage B nested group extension.
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
type GroupId = 'group-a1';
type ContainerId = SectionId | GroupId;

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

interface StageGroup {
  id: GroupId;
  title: string;
  note: string;
  parentSectionId: SectionId;
}

type SortableItems = Record<ContainerId, string[]>;

const SECTIONS: StageSection[] = [
  { id: 'section-a', title: 'Section A', note: 'Starts with 5 blocks and fixed Group A1' },
  { id: 'section-b', title: 'Section B', note: 'Starts with 3 blocks' },
];

const GROUP_A1: StageGroup = {
  id: 'group-a1',
  title: 'Group A1',
  note: 'Fixed nested destination inside Section A',
  parentSectionId: 'section-a',
};

const CONTAINER_IDS: ContainerId[] = ['section-a', 'section-b', 'group-a1'];

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
  'group-a1': [],
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
  return Object.fromEntries(
    CONTAINER_IDS.map(containerId => [containerId, [...items[containerId]]]),
  ) as SortableItems;
}

function sameItems(a: SortableItems, b: SortableItems): boolean {
  return CONTAINER_IDS.every(containerId => a[containerId].join('|') === b[containerId].join('|'));
}

function findBlockContainer(items: SortableItems, blockId: string): ContainerId | null {
  for (const containerId of CONTAINER_IDS) {
    if (items[containerId].includes(blockId)) return containerId;
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
      CONTAINER_IDS.map(containerId => [
        containerId,
        items[containerId].map(blockId => BLOCKS[blockId]).filter(Boolean),
      ]),
    ) as Record<ContainerId, StageBlock[]>;
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
      const container = sourceId ? findBlockContainer(items, sourceId) : null;
      setLastMove(container ? `Dropped ${sourceId} in ${container}` : 'Dropped');
    }
    setActiveBlockId(null);
    preDragItemsRef.current = null;
  }, [items]);

  const resetStage = useCallback(() => {
    setItems(cloneItems(INITIAL_ITEMS));
    setActiveBlockId(null);
    setLastMove('Reset to Stage B seed data');
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
            <h1>Stage B nested group</h1>
          </div>
          <button className="v5-button" type="button" onClick={resetStage}>
            Reset Stage B
          </button>
        </header>

        <section className="v5-status" aria-live="polite">
          <strong>Pointer core:</strong> official `useSortable` items, section/group
          `useDroppable` targets, and `move(items, event)` in `onDragOver`.
          State containers: section-a, section-b, group-a1. {lastMove}.
        </section>

        <div className="v5-board">
          {SECTIONS.map(section => (
            <SortableSection
              key={section.id}
              section={section}
              blocks={orderedBlocks[section.id]}
              group={section.id === GROUP_A1.parentSectionId ? GROUP_A1 : null}
              groupBlocks={section.id === GROUP_A1.parentSectionId ? orderedBlocks[GROUP_A1.id] : []}
            />
          ))}
        </div>

        <section className="v5-checklist" aria-label="Manual Stage B checklist">
          <h2>Manual 10-attempt checklist</h2>
          <ul>
            <li>Move Section A to group and Section B to group.</li>
            <li>Move group to Section A and group to Section B.</li>
            <li>Reorder within group; insert first, middle, and last in group.</li>
            <li>Move all blocks out of the group, then drop into the empty group.</li>
            <li>Cancel an active cross-container drag and confirm state is restored.</li>
            <li>Repeat Stage A regressions: section reorder, A to B, B to A, empty-section drop.</li>
          </ul>
        </section>
      </main>

      <DragOverlay>
        {activeBlock ? <DragPreview block={activeBlock} /> : null}
      </DragOverlay>
    </DragDropProvider>
  );
}

function SortableSection({
  section,
  blocks,
  group,
  groupBlocks,
}: {
  section: StageSection;
  blocks: StageBlock[];
  group: StageGroup | null;
  groupBlocks: StageBlock[];
}) {
  const { ref, isDropTarget } = useDroppable({
    id: section.id,
    type: 'stage-section',
    accept: 'stage-block',
    collisionPriority: 1,
    data: { containerId: section.id, kind: 'section-container' },
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

      <div className="v5-list" role="list" aria-label={`${section.title} direct blocks`}>
        {blocks.length === 0 ? (
          <div className="v5-empty">Drop here when this section is empty</div>
        ) : (
          blocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              containerId={section.id}
              index={index}
            />
          ))
        )}
      </div>

      {group ? <SortableGroup group={group} blocks={groupBlocks} /> : null}
    </section>
  );
}

function SortableGroup({ group, blocks }: { group: StageGroup; blocks: StageBlock[] }) {
  const { ref, isDropTarget } = useDroppable({
    id: group.id,
    type: 'stage-group',
    accept: 'stage-block',
    collisionPriority: 2,
    data: { containerId: group.id, parentSectionId: group.parentSectionId, kind: 'group-container' },
  });

  return (
    <section
      ref={ref}
      className={`v5-group ${isDropTarget ? 'v5-group-target' : ''}`}
      data-group-id={group.id}
      data-block-count={blocks.length}
      aria-label={`${group.title}, ${blocks.length} blocks`}
    >
      <div className="v5-group-header">
        <div>
          <h3>{group.title}</h3>
          <p>{group.note}</p>
        </div>
        <span className="v5-count">{blocks.length}</span>
      </div>

      <div className="v5-group-list" role="list" aria-label={`${group.title} blocks`}>
        {blocks.length === 0 ? (
          <div className="v5-empty v5-empty-group">Drop here when this group is empty</div>
        ) : (
          blocks.map((block, index) => (
            <SortableBlock
              key={block.id}
              block={block}
              containerId={group.id}
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
  containerId,
  index,
}: {
  block: StageBlock;
  containerId: ContainerId;
  index: number;
}) {
  const { ref, isDragging, isDragSource, isDropTarget } = useSortable({
    id: block.id,
    type: 'stage-block',
    accept: 'stage-block',
    group: containerId,
    index,
    collisionPriority: 4,
    data: {
      blockId: block.id,
      containerId,
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
      data-container-id={containerId}
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
