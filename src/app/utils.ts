import { PlanBlock, LaneInfo, MAX_MINUTES } from "./types";

// Date formatting utilities
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
};

export const getToday = (): string => formatDate(new Date());

export const getWeekDates = (date: Date): Date[] => {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const weekStart = new Date(date);
  weekStart.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
};

// Time formatting utilities
export const formatTimeFromMinutes = (minutes: number): string => {
  if (minutes >= MAX_MINUTES) {
    return "24:00";
  }
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

// Calculate total hours from blocks
export const calculateTotalHours = (blocks: PlanBlock[]): string => {
  const totalMinutes = blocks.reduce((acc, block) => acc + (block.end - block.start), 0);
  return (totalMinutes / 60).toFixed(1);
};

// Calculate lanes for overlapping blocks (side by side display)
export const calculateBlockLanes = (blocks: PlanBlock[]): Map<string, LaneInfo> => {
  const result = new Map<string, LaneInfo>();
  if (blocks.length === 0) return result;

  // Sort blocks by start time
  const sortedBlocks = [...blocks].sort((a, b) => a.start - b.start);

  // Group overlapping blocks
  const groups: PlanBlock[][] = [];
  let currentGroup: PlanBlock[] = [];

  for (const block of sortedBlocks) {
    if (currentGroup.length === 0) {
      currentGroup.push(block);
    } else {
      // Check if this block overlaps with any block in current group
      const overlaps = currentGroup.some(
        (b) => block.start < b.end && block.end > b.start
      );
      if (overlaps) {
        currentGroup.push(block);
      } else {
        groups.push(currentGroup);
        currentGroup = [block];
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Assign lanes within each group
  for (const group of groups) {
    const totalLanes = group.length;
    const sortedGroup = [...group].sort((a, b) => a.start - b.start);
    sortedGroup.forEach((block, index) => {
      result.set(block.id, { lane: index, totalLanes });
    });
  }

  return result;
};

// Generate time options for dropdowns
export const generateTimeOptions = (includeEndOfDay: boolean = false): number[] => {
  const length = includeEndOfDay ? 24 * 6 + 1 : 24 * 6;
  return Array.from({ length }, (_, i) => i * 10);
};
