"use client";

import { forwardRef, useMemo } from "react";
import {
  PlanBlock,
  LaneInfo,
  SLOT_HEIGHT,
  TOTAL_ROWS,
  MINUTES_PER_SLOT,
  BLOCK_MAX_WIDTH_PERCENT,
} from "../types";

interface SelectionPreview {
  startSlot: number;
  endSlot: number;
}

interface TimelineColumnProps {
  blocks: PlanBlock[];
  blockLanes: Map<string, LaneInfo>;
  selectionPreview: SelectionPreview | null;
  draggingBlockId: string | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onBlockDragStart: (e: React.MouseEvent | React.TouchEvent, blockId: string) => void;
  onBlockClick: (e: React.MouseEvent, block: PlanBlock) => void;
}

// Memoized grid lines component
const GridLines = () => {
  const lines = useMemo(() => {
    return Array.from({ length: TOTAL_ROWS }, (_, index) => {
      const slotEndMinutes = (index + 1) * MINUTES_PER_SLOT;
      const isHourLine = slotEndMinutes % 60 === 0;
      const isHalfHourLine = slotEndMinutes % 30 === 0 && !isHourLine;
      return { index, isHourLine, isHalfHourLine };
    });
  }, []);

  return (
    <>
      {lines.map(({ index, isHourLine, isHalfHourLine }) => (
        <div
          key={index}
          className={`absolute left-0 right-0 border-b ${
            isHourLine
              ? "border-zinc-300"
              : isHalfHourLine
              ? "border-zinc-200"
              : "border-dashed border-zinc-100"
          }`}
          style={{ top: `${(index + 1) * SLOT_HEIGHT}px` }}
        />
      ))}
    </>
  );
};

// Block component
interface TimeBlockProps {
  block: PlanBlock;
  laneInfo: LaneInfo;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

const TimeBlock = ({ block, laneInfo, isDragging, onDragStart, onClick }: TimeBlockProps) => {
  const top = (block.start / MINUTES_PER_SLOT) * SLOT_HEIGHT;
  const height = ((block.end - block.start) / MINUTES_PER_SLOT) * SLOT_HEIGHT;
  const widthPercent = BLOCK_MAX_WIDTH_PERCENT / laneInfo.totalLanes;
  const leftPercent = laneInfo.lane * widthPercent;

  return (
    <div
      className={`absolute rounded px-1 py-0.5 text-left text-[10px] leading-tight font-semibold text-zinc-800 shadow-sm cursor-pointer select-none overflow-hidden flex flex-col ${block.color} ${
        isDragging
          ? "opacity-70 ring-2 ring-blue-500 z-30"
          : "hover:ring-1 hover:ring-blue-300 z-10"
      }`}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
      }}
      onMouseDown={onDragStart}
      onTouchStart={onDragStart}
      onClick={onClick}
    >
      <div className="truncate font-bold">{block.title}</div>
      {block.description && (
        <div className="mt-auto whitespace-pre-line text-[9px] opacity-80 overflow-hidden line-clamp-4">
          {block.description}
        </div>
      )}
    </div>
  );
};

export const TimelineColumn = forwardRef<HTMLDivElement, TimelineColumnProps>(
  (
    {
      blocks,
      blockLanes,
      selectionPreview,
      draggingBlockId,
      onMouseDown,
      onTouchStart,
      onBlockDragStart,
      onBlockClick,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded border border-zinc-200 bg-white touch-none"
        style={{ height: `${TOTAL_ROWS * SLOT_HEIGHT + 2}px` }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <GridLines />

        {/* Selection preview */}
        {selectionPreview && (
          <div
            className="absolute left-1 right-1 bg-blue-200/50 border-2 border-blue-400 border-dashed rounded z-20"
            style={{
              top: `${selectionPreview.startSlot * SLOT_HEIGHT}px`,
              height: `${(selectionPreview.endSlot - selectionPreview.startSlot) * SLOT_HEIGHT}px`,
            }}
          />
        )}

        {/* Blocks */}
        {blocks.map((block) => (
          <TimeBlock
            key={block.id}
            block={block}
            laneInfo={blockLanes.get(block.id) || { lane: 0, totalLanes: 1 }}
            isDragging={draggingBlockId === block.id}
            onDragStart={(e) => onBlockDragStart(e, block.id)}
            onClick={(e) => onBlockClick(e, block)}
          />
        ))}
      </div>
    );
  }
);

TimelineColumn.displayName = "TimelineColumn";
