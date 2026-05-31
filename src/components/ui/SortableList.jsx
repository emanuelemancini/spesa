/**
 * SortableList — wrapper riutilizzabile per drag-to-reorder con @dnd-kit
 *
 * Uso:
 *   <SortableList items={arr} onReorder={newIds => ...} isReordering={bool}>
 *     {(item, { dragHandleProps }) => <MyRow item={item} dragHandle={dragHandleProps} />}
 *   </SortableList>
 */
import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Singolo item sortable ────────────────────────────────────────────────────

export function SortableItem({ id, isReordering, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? 'relative' : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const dragHandleProps = isReordering
    ? { ...attributes, ...listeners, className: 'touch-none select-none text-slate-300 shrink-0 cursor-grab active:cursor-grabbing px-1' }
    : null;

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps, isDragging })}
    </div>
  );
}

// ── Wrapper lista ────────────────────────────────────────────────────────────

export function SortableList({ items, onReorder, isReordering, className = 'grid gap-3', children }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(i => i.id === active.id);
    const newIdx = items.findIndex(i => i.id === over.id);
    onReorder(arrayMove(items, oldIdx, newIdx).map(i => i.id));
  };

  if (!isReordering) {
    return <div className={className}>{items.map(item => <React.Fragment key={item.id}>{children(item, { dragHandleProps: null, isDragging: false })}</React.Fragment>)}</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map(item => (
            <SortableItem key={item.id} id={item.id} isReordering={isReordering}>
              {({ dragHandleProps, isDragging }) => children(item, { dragHandleProps, isDragging })}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ── Bottone Riordina / Fine ──────────────────────────────────────────────────

export function ReorderButton({ isReordering, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
        isReordering ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className="material-symbols-outlined !text-sm">{isReordering ? 'check' : 'sort'}</span>
      {isReordering ? 'Fine' : 'Riordina'}
    </button>
  );
}

// ── Drag handle icon ─────────────────────────────────────────────────────────

export function DragHandle({ dragHandleProps }) {
  if (!dragHandleProps) return null;
  return (
    <div {...dragHandleProps}>
      <span className="material-symbols-outlined !text-2xl">drag_indicator</span>
    </div>
  );
}
