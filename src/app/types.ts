// Types for the Planner application

export interface PlanBlock {
  id: string;
  title: string;
  description?: string;
  start: number; // minutes from midnight
  end: number; // minutes from midnight
  color: string;
  date: string; // YYYY-MM-DD format
  groupId?: string; // For multi-day plans
}

export interface DraggingBlock {
  id: string;
  type: "plan" | "execution";
  startY: number;
  originalStart: number;
  originalEnd: number;
}

export interface Selection {
  type: "plan" | "execution";
  startSlot: number;
  currentSlot: number;
}

export interface DateSelection {
  startIndex: number;
  currentIndex: number;
}

export interface ModalState {
  mode: "add" | "edit" | "view";
  type: "plan" | "execution";
  blockId?: string;
  startMinutes: number;
  endMinutes: number;
  title: string;
  description: string;
  color: string;
  startDate: string;
  endDate: string;
  isMultiDay: boolean;
}

export interface MultiDayPlan {
  groupId: string;
  title: string;
  color: string;
  startIdx: number;
  endIdx: number;
}

export interface LaneInfo {
  lane: number;
  totalLanes: number;
}

// Constants
export const SLOT_HEIGHT = 16;
export const TOTAL_ROWS = 24 * 6; // 144 slots (10 minutes each)
export const MINUTES_PER_SLOT = 10;
export const MAX_MINUTES = 24 * 60; // 1440
export const BLOCK_MAX_WIDTH_PERCENT = 85;
export const COLLAPSED_MULTI_DAY_LIMIT = 2;
export const HEADER_OFFSET = 44;

export const STORAGE_KEYS = {
  planBlocks: "planner_planBlocks",
  executionBlocks: "planner_executionBlocks",
  topMessage: "planner_topMessage",
} as const;

export const COLORS = [
  "bg-pink-200",
  "bg-green-200",
  "bg-orange-200",
  "bg-yellow-200",
  "bg-blue-200",
  "bg-purple-200",
  "bg-red-200",
  "bg-teal-200",
] as const;

export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;
