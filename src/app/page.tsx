"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Home as HomeIcon,
  Target,
  Camera,
  MessageCircle,
  CalendarCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SLOT_HEIGHT = 16;
const TOTAL_ROWS = 24 * 6;
const MINUTES_PER_SLOT = 10;

const STORAGE_KEYS = {
  planBlocks: "planner_planBlocks",
  executionBlocks: "planner_executionBlocks",
  topMessage: "planner_topMessage",
};

interface PlanBlock {
  id: string;
  title: string;
  description?: string;
  start: number;
  end: number;
  color: string;
  date: string;
  groupId?: string; // For multi-day plans
}

const getToday = () => {
  const today = new Date();
  return formatDate(today);
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}`;
};

const getWeekDates = (date: Date): Date[] => {
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

const defaultPlanBlocks: PlanBlock[] = [
  { id: "p1", title: "화학1", description: "원자 기출Pick 화학 1\n32~38", start: 9 * 60, end: 10 * 60 + 20, color: "bg-pink-200", date: getToday() },
  { id: "p2", title: "사회문화 수행", description: "평가 준비", start: 10 * 60 + 20, end: 11 * 60 + 10, color: "bg-green-200", date: getToday() },
  { id: "p3", title: "수능특강 문학", description: "6, 7 강", start: 17 * 60, end: 18 * 60, color: "bg-orange-200", date: getToday() },
  { id: "p4", title: "영어", description: "경선식 수능 영단어\nDay31~32", start: 18 * 60, end: 18 * 60 + 40, color: "bg-yellow-200", date: getToday() },
  { id: "p5", title: "공통수학1", description: "쎈 공통수학1\n20~28", start: 18 * 60 + 40, end: 20 * 60, color: "bg-blue-200", date: getToday() },
];

const defaultExecutionBlocks: PlanBlock[] = [
  { id: "e1", title: "슈퍼에서 우유", description: "사기", start: 9 * 60 + 10, end: 9 * 60 + 50, color: "bg-zinc-200", date: getToday() },
  { id: "e2", title: "영어", description: "공통수학1\n쎈 공통수학1", start: 17 * 60, end: 17 * 60 + 40, color: "bg-yellow-200", date: getToday() },
  { id: "e3", title: "저녁만 먹음", start: 18 * 60, end: 18 * 60 + 20, color: "bg-zinc-200", date: getToday() },
  { id: "e4", title: "국어", description: "수능특강 문학\n6~8 강", start: 18 * 60 + 20, end: 19 * 60 + 30, color: "bg-orange-200", date: getToday() },
];

const COLORS = [
  "bg-pink-200",
  "bg-green-200",
  "bg-orange-200",
  "bg-yellow-200",
  "bg-blue-200",
  "bg-purple-200",
  "bg-red-200",
  "bg-teal-200",
];

const formatTimeFromMinutes = (minutes: number) => {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

// Calculate lanes for overlapping blocks (side by side display)
const calculateBlockLanes = (blocks: PlanBlock[]): Map<string, { lane: number; totalLanes: number }> => {
  const result = new Map<string, { lane: number; totalLanes: number }>();
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
    // Sort by start time within group for consistent lane assignment
    const sortedGroup = [...group].sort((a, b) => a.start - b.start);
    sortedGroup.forEach((block, index) => {
      result.set(block.id, { lane: index, totalLanes });
    });
  }

  return result;
};

export default function Home() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [planBlocks, setPlanBlocks] = useState<PlanBlock[]>(defaultPlanBlocks);
  const [executionBlocks, setExecutionBlocks] = useState<PlanBlock[]>(defaultExecutionBlocks);
  const [topMessage, setTopMessage] = useState("공부 화이팅!!");
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editingMessageValue, setEditingMessageValue] = useState("");
  const [isMultiDayExpanded, setIsMultiDayExpanded] = useState(false);

  // Block dragging (moving existing blocks)
  const [draggingBlock, setDraggingBlock] = useState<{
    id: string;
    type: "plan" | "execution";
    startY: number;
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);

  // Time range selection (for creating new blocks)
  const [selecting, setSelecting] = useState<{
    type: "plan" | "execution";
    startSlot: number;
    currentSlot: number;
  } | null>(null);

  // Date range selection (for multi-day plans)
  const [dateSelecting, setDateSelecting] = useState<{
    startIndex: number;
    currentIndex: number;
  } | null>(null);

  // Modal state
  const [modalState, setModalState] = useState<{
    mode: "add" | "edit";
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
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const planColumnRef = useRef<HTMLDivElement>(null);
  const executionColumnRef = useRef<HTMLDivElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedPlanBlocks = localStorage.getItem(STORAGE_KEYS.planBlocks);
      const savedExecutionBlocks = localStorage.getItem(STORAGE_KEYS.executionBlocks);
      const savedTopMessage = localStorage.getItem(STORAGE_KEYS.topMessage);
      if (savedPlanBlocks) setPlanBlocks(JSON.parse(savedPlanBlocks));
      if (savedExecutionBlocks) setExecutionBlocks(JSON.parse(savedExecutionBlocks));
      if (savedTopMessage) setTopMessage(savedTopMessage);
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.planBlocks, JSON.stringify(planBlocks));
  }, [planBlocks, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.executionBlocks, JSON.stringify(executionBlocks));
  }, [executionBlocks, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEYS.topMessage, topMessage);
  }, [topMessage, isHydrated]);

  const selectedDateStr = formatDate(selectedDate);
  const weekDates = getWeekDates(selectedDate);
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const todayStr = getToday();

  const filteredPlanBlocks = planBlocks.filter(b => b.date === selectedDateStr);
  const filteredExecutionBlocks = executionBlocks.filter(b => b.date === selectedDateStr);

  // Calculate lanes for overlapping blocks
  const planBlockLanes = calculateBlockLanes(filteredPlanBlocks);
  const executionBlockLanes = calculateBlockLanes(filteredExecutionBlocks);

  // Find multi-day plans that span across the current week
  const weekDateStrs = weekDates.map(d => formatDate(d));
  const multiDayPlans = (() => {
    const groups = new Map<string, PlanBlock[]>();
    planBlocks.forEach(block => {
      if (block.groupId) {
        const existing = groups.get(block.groupId) || [];
        existing.push(block);
        groups.set(block.groupId, existing);
      }
    });

    const result: { groupId: string; title: string; color: string; startIdx: number; endIdx: number }[] = [];
    groups.forEach((blocks, groupId) => {
      const datesInWeek = blocks
        .filter(b => weekDateStrs.includes(b.date))
        .map(b => weekDateStrs.indexOf(b.date))
        .filter(idx => idx !== -1);

      if (datesInWeek.length > 0) {
        const startIdx = Math.min(...datesInWeek);
        const endIdx = Math.max(...datesInWeek);
        result.push({
          groupId,
          title: blocks[0].title,
          color: blocks[0].color,
          startIdx,
          endIdx,
        });
      }
    });
    return result;
  })();

  const calculateTotalHours = (blocks: PlanBlock[]) => {
    const totalMinutes = blocks.reduce((acc, block) => acc + (block.end - block.start), 0);
    return (totalMinutes / 60).toFixed(1);
  };

  // Current time
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const currentRow = currentMinutes / 10;
  const currentLabel = formatTimeFromMinutes(currentMinutes);

  // Auto-scroll to current time
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollTo = Math.max(0, currentRow * SLOT_HEIGHT - 200);
      scrollContainerRef.current.scrollTop = scrollTo;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Date navigation
  const goToPrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Message editing
  const startEditingMessage = () => {
    setEditingMessageValue(topMessage);
    setIsEditingMessage(true);
    setTimeout(() => messageInputRef.current?.focus(), 0);
  };

  const saveMessage = () => {
    if (editingMessageValue.trim()) {
      setTopMessage(editingMessageValue.trim());
    }
    setIsEditingMessage(false);
  };

  // Block dragging (move existing)
  const handleBlockDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    blockId: string,
    type: "plan" | "execution"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const blocks = type === "plan" ? planBlocks : executionBlocks;
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setHasDragged(false);
    setDraggingBlock({
      id: blockId,
      type,
      startY: clientY,
      originalStart: block.start,
      originalEnd: block.end,
    });
  };

  const handleBlockDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingBlock) return;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - draggingBlock.startY;
    const deltaSlots = Math.round(deltaY / SLOT_HEIGHT);
    const deltaMinutes = deltaSlots * MINUTES_PER_SLOT;

    // Mark as dragged if moved at least one slot
    if (Math.abs(deltaSlots) > 0) {
      setHasDragged(true);
    }

    const duration = draggingBlock.originalEnd - draggingBlock.originalStart;
    const newStart = Math.max(0, Math.min(24 * 60 - duration, draggingBlock.originalStart + deltaMinutes));
    const newEnd = newStart + duration;

    const setBlocks = draggingBlock.type === "plan" ? setPlanBlocks : setExecutionBlocks;
    setBlocks(blocks =>
      blocks.map(b => b.id === draggingBlock.id ? { ...b, start: newStart, end: newEnd } : b)
    );
  }, [draggingBlock]);

  const handleBlockDragEnd = useCallback(() => {
    setDraggingBlock(null);
    // Reset hasDragged after a short delay to allow click handler to check it
    setTimeout(() => setHasDragged(false), 100);
  }, []);

  useEffect(() => {
    if (draggingBlock) {
      window.addEventListener("mousemove", handleBlockDragMove);
      window.addEventListener("mouseup", handleBlockDragEnd);
      window.addEventListener("touchmove", handleBlockDragMove);
      window.addEventListener("touchend", handleBlockDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleBlockDragMove);
        window.removeEventListener("mouseup", handleBlockDragEnd);
        window.removeEventListener("touchmove", handleBlockDragMove);
        window.removeEventListener("touchend", handleBlockDragEnd);
      };
    }
  }, [draggingBlock, handleBlockDragMove, handleBlockDragEnd]);

  // Time range selection (drag to create)
  const getSlotFromEvent = (e: React.MouseEvent | React.TouchEvent, columnRef: React.RefObject<HTMLDivElement | null>) => {
    if (!columnRef.current) return 0;
    const rect = columnRef.current.getBoundingClientRect();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
    return Math.max(0, Math.min(TOTAL_ROWS - 1, Math.floor(y / SLOT_HEIGHT)));
  };

  const handleSelectionStart = (e: React.MouseEvent | React.TouchEvent, type: "plan" | "execution") => {
    if (draggingBlock) return;
    const columnRef = type === "plan" ? planColumnRef : executionColumnRef;
    const slot = getSlotFromEvent(e, columnRef);
    setSelecting({ type, startSlot: slot, currentSlot: slot });
  };

  const handleSelectionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!selecting) return;
    const columnRef = selecting.type === "plan" ? planColumnRef : executionColumnRef;
    if (!columnRef.current) return;

    const rect = columnRef.current.getBoundingClientRect();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const y = clientY - rect.top;
    const slot = Math.max(0, Math.min(TOTAL_ROWS - 1, Math.floor(y / SLOT_HEIGHT)));
    setSelecting(prev => prev ? { ...prev, currentSlot: slot } : null);
  }, [selecting]);

  const handleSelectionEnd = useCallback(() => {
    if (!selecting) return;
    const startSlot = Math.min(selecting.startSlot, selecting.currentSlot);
    const endSlot = Math.max(selecting.startSlot, selecting.currentSlot) + 1;
    const startMinutes = startSlot * MINUTES_PER_SLOT;
    const endMinutes = endSlot * MINUTES_PER_SLOT;

    if (endMinutes - startMinutes >= MINUTES_PER_SLOT) {
      setModalState({
        mode: "add",
        type: selecting.type,
        startMinutes,
        endMinutes,
        title: "",
        description: "",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        startDate: selectedDateStr,
        endDate: selectedDateStr,
        isMultiDay: false,
      });
    }
    setSelecting(null);
  }, [selecting, selectedDateStr]);

  useEffect(() => {
    if (selecting) {
      window.addEventListener("mousemove", handleSelectionMove);
      window.addEventListener("mouseup", handleSelectionEnd);
      window.addEventListener("touchmove", handleSelectionMove);
      window.addEventListener("touchend", handleSelectionEnd);
      return () => {
        window.removeEventListener("mousemove", handleSelectionMove);
        window.removeEventListener("mouseup", handleSelectionEnd);
        window.removeEventListener("touchmove", handleSelectionMove);
        window.removeEventListener("touchend", handleSelectionEnd);
      };
    }
  }, [selecting, handleSelectionMove, handleSelectionEnd]);

  // Date range selection for multi-day plans
  const handleDateSelectionStart = (e: React.MouseEvent | React.TouchEvent, index: number) => {
    e.preventDefault();
    setDateSelecting({ startIndex: index, currentIndex: index });
  };

  const handleDateSelectionMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dateSelecting) return;
    // Get the element under the cursor
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const element = document.elementFromPoint(clientX, clientY);
    const dateButton = element?.closest("[data-date-index]");
    if (dateButton) {
      const index = parseInt(dateButton.getAttribute("data-date-index") || "0", 10);
      setDateSelecting(prev => prev ? { ...prev, currentIndex: index } : null);
    }
  }, [dateSelecting]);

  const handleDateSelectionEnd = useCallback(() => {
    if (!dateSelecting) return;
    const startIdx = Math.min(dateSelecting.startIndex, dateSelecting.currentIndex);
    const endIdx = Math.max(dateSelecting.startIndex, dateSelecting.currentIndex);

    if (startIdx !== endIdx) {
      // Open modal for multi-day plan
      const startDate = weekDates[startIdx];
      const endDate = weekDates[endIdx];
      setModalState({
        mode: "add",
        type: "plan",
        startMinutes: 9 * 60, // Default to 9:00 AM
        endMinutes: 10 * 60, // Default to 10:00 AM
        title: "",
        description: "",
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        isMultiDay: true,
      });
    } else {
      // Single date click - just select that date
      setSelectedDate(weekDates[startIdx]);
    }
    setDateSelecting(null);
  }, [dateSelecting, weekDates]);

  useEffect(() => {
    if (dateSelecting) {
      window.addEventListener("mousemove", handleDateSelectionMove);
      window.addEventListener("mouseup", handleDateSelectionEnd);
      window.addEventListener("touchmove", handleDateSelectionMove);
      window.addEventListener("touchend", handleDateSelectionEnd);
      return () => {
        window.removeEventListener("mousemove", handleDateSelectionMove);
        window.removeEventListener("mouseup", handleDateSelectionEnd);
        window.removeEventListener("touchmove", handleDateSelectionMove);
        window.removeEventListener("touchend", handleDateSelectionEnd);
      };
    }
  }, [dateSelecting, handleDateSelectionMove, handleDateSelectionEnd]);

  // Edit existing block
  const handleBlockClick = (e: React.MouseEvent, block: PlanBlock, type: "plan" | "execution") => {
    e.stopPropagation();
    // Don't open edit dialog if block was dragged
    if (draggingBlock || hasDragged) return;
    setModalState({
      mode: "edit",
      type,
      blockId: block.id,
      startMinutes: block.start,
      endMinutes: block.end,
      title: block.title,
      description: block.description || "",
      color: block.color,
      startDate: block.date,
      endDate: block.date,
      isMultiDay: false,
    });
  };

  // Save block (add or edit)
  const handleSaveBlock = () => {
    if (!modalState || !modalState.title.trim()) return;

    if (modalState.mode === "edit" && modalState.blockId) {
      // Update existing block
      const setBlocks = modalState.type === "plan" ? setPlanBlocks : setExecutionBlocks;
      setBlocks(blocks =>
        blocks.map(b =>
          b.id === modalState.blockId
            ? { ...b, title: modalState.title, description: modalState.description || undefined, start: modalState.startMinutes, end: modalState.endMinutes, color: modalState.color }
            : b
        )
      );
    } else {
      // Add new block(s)
      const groupId = modalState.isMultiDay ? `group-${Date.now()}` : undefined;
      const newBlock: PlanBlock = {
        id: `${modalState.type[0]}${Date.now()}`,
        title: modalState.title,
        description: modalState.description || undefined,
        start: modalState.startMinutes,
        end: modalState.endMinutes,
        color: modalState.color,
        date: modalState.startDate,
        groupId,
      };

      if (modalState.type === "plan") {
        if (modalState.isMultiDay && modalState.endDate > modalState.startDate) {
          const startDate = new Date(modalState.startDate);
          const endDate = new Date(modalState.endDate);
          const blocks: PlanBlock[] = [];
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            blocks.push({
              ...newBlock,
              id: `p${Date.now()}-${formatDate(currentDate)}`,
              date: formatDate(currentDate),
            });
            currentDate.setDate(currentDate.getDate() + 1);
          }
          setPlanBlocks(prev => [...prev, ...blocks]);
        } else {
          setPlanBlocks(prev => [...prev, newBlock]);
        }
      } else {
        setExecutionBlocks(prev => [...prev, newBlock]);
      }
    }
    setModalState(null);
  };

  // Delete block
  const handleDeleteBlock = () => {
    if (!modalState || !modalState.blockId) return;
    const setBlocks = modalState.type === "plan" ? setPlanBlocks : setExecutionBlocks;
    setBlocks(blocks => blocks.filter(b => b.id !== modalState.blockId));
    setModalState(null);
  };

  // Handle clicking on multi-day plan bar
  const handleMultiDayPlanClick = (groupId: string) => {
    const groupBlocks = planBlocks.filter(b => b.groupId === groupId);
    if (groupBlocks.length === 0) return;

    const firstBlock = groupBlocks[0];
    const dates = groupBlocks.map(b => b.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    setModalState({
      mode: "edit",
      type: "plan",
      blockId: groupId, // Use groupId as identifier
      startMinutes: firstBlock.start,
      endMinutes: firstBlock.end,
      title: firstBlock.title,
      description: firstBlock.description || "",
      color: firstBlock.color,
      startDate,
      endDate,
      isMultiDay: true,
    });
  };

  // Delete multi-day plan group
  const handleDeleteMultiDayPlan = () => {
    if (!modalState || !modalState.blockId || !modalState.isMultiDay) return;
    setPlanBlocks(blocks => blocks.filter(b => b.groupId !== modalState.blockId));
    setModalState(null);
  };

  // Save multi-day plan group
  const handleSaveMultiDayPlan = () => {
    if (!modalState || !modalState.blockId || !modalState.isMultiDay || !modalState.title.trim()) return;

    setPlanBlocks(blocks =>
      blocks.map(b =>
        b.groupId === modalState.blockId
          ? {
            ...b,
            title: modalState.title,
            description: modalState.description || undefined,
            start: modalState.startMinutes,
            end: modalState.endMinutes,
            color: modalState.color,
          }
          : b
      )
    );
    setModalState(null);
  };

  const headerOffset = 44;

  // Selection preview
  const selectionPreview = selecting ? {
    startSlot: Math.min(selecting.startSlot, selecting.currentSlot),
    endSlot: Math.max(selecting.startSlot, selecting.currentSlot) + 1,
  } : null;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto flex h-screen w-full max-w-[390px] flex-col bg-white shadow-sm overflow-hidden">
        {/* Fixed Header */}
        <header className="shrink-0 border-b border-zinc-200 px-4 pt-4">
          <div className="flex items-center justify-end text-sm text-zinc-600">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={goToToday}
                title="오늘로 이동"
              >
                <span className="text-xs font-semibold">{new Date().getDate()}</span>
              </Button>
            </div>
          </div>

          <div className="mt-3 text-center">
            {isEditingMessage ? (
              <div className="flex items-center justify-center gap-2">
                <Input
                  ref={messageInputRef}
                  value={editingMessageValue}
                  onChange={(e) => setEditingMessageValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveMessage();
                    if (e.key === "Escape") setIsEditingMessage(false);
                  }}
                  className="w-48 text-center text-lg font-semibold"
                />
                <Button size="sm" onClick={saveMessage}>저장</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingMessage(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h1
                onClick={startEditingMessage}
                className="cursor-pointer text-xl font-semibold hover:text-blue-600"
                title="클릭하여 수정"
              >
                {topMessage}
              </h1>
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-1 text-sm text-zinc-600">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth} title="이전 달">
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevDay} title="이전 날">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[120px] text-center text-base font-semibold text-zinc-900">
              {formatDisplayDate(selectedDate)}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay} title="다음 날">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth} title="다음 달">
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs text-zinc-500">
            {dayNames.map((day, index) => (
              <div key={day} className={weekDates[index] && formatDate(weekDates[index]) === selectedDateStr ? "font-semibold text-blue-600" : ""}>
                {day}
              </div>
            ))}
            {weekDates.map((date, index) => {
              const dateStr = formatDate(date);
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayStr;
              const isInDateSelection = dateSelecting && (
                (index >= Math.min(dateSelecting.startIndex, dateSelecting.currentIndex)) &&
                (index <= Math.max(dateSelecting.startIndex, dateSelecting.currentIndex))
              );
              return (
                <div key={index} className="text-sm text-zinc-700">
                  <button
                    data-date-index={index}
                    onMouseDown={(e) => handleDateSelectionStart(e, index)}
                    onTouchStart={(e) => handleDateSelectionStart(e, index)}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors select-none ${isInDateSelection
                      ? "bg-blue-300 text-white"
                      : isSelected
                        ? "bg-blue-600 text-white"
                        : isToday
                          ? "border-2 border-blue-600 text-blue-600"
                          : "hover:bg-zinc-100"
                      }`}
                  >
                    {date.getDate()}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Multi-day plan bars - collapsible */}
          {multiDayPlans.length > 0 && (
            <div className="mt-2 pb-2">
              <div className="space-y-1">
                {(isMultiDayExpanded ? multiDayPlans : multiDayPlans.slice(0, 2)).map((plan) => (
                  <div key={plan.groupId} className="relative h-5 grid grid-cols-7 gap-2">
                    <div
                      className={`absolute h-full rounded text-[10px] font-semibold text-zinc-800 flex items-center px-2 truncate cursor-pointer hover:ring-1 hover:ring-blue-400 ${plan.color}`}
                      style={{
                        left: `calc(${(plan.startIdx / 7) * 100}% + 4px)`,
                        width: `calc(${((plan.endIdx - plan.startIdx + 1) / 7) * 100}% - 8px)`,
                      }}
                      onClick={() => handleMultiDayPlanClick(plan.groupId)}
                      title="클릭하여 수정"
                    >
                      {plan.title}
                    </div>
                  </div>
                ))}
              </div>
              {multiDayPlans.length > 2 && (
                <button
                  onClick={() => setIsMultiDayExpanded(!isMultiDayExpanded)}
                  className="mt-1 flex items-center justify-center w-full text-[10px] text-zinc-500 hover:text-zinc-700"
                >
                  {isMultiDayExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-0.5" />
                      접기
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-0.5" />
                      {multiDayPlans.length - 2}개 더 보기
                    </>
                  )}
                </button>
              )}
            </div>
          )}
          {multiDayPlans.length === 0 && <div className="pb-4" />}
        </header>

        {/* Scrollable Timeline Section */}
        <section ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-zinc-50 px-3 py-3">
          <div className="grid grid-cols-[48px_1fr] gap-2">
            {/* Time labels column */}
            <div className="text-[10px] text-zinc-500">
              {/* Spacer to align with stats header + mt-2 margin */}
              <div style={{ height: `${headerOffset}px` }} />
              <div className="grid" style={{ gridTemplateRows: `repeat(24, ${SLOT_HEIGHT * 6}px)` }}>
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex items-start justify-end pr-1 pt-1">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline columns */}
            <div className="relative">
              {/* Stats header */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold text-zinc-600">
                <div className="rounded border border-zinc-200 bg-white py-2">
                  계획 <span className="text-blue-600">총 {calculateTotalHours(filteredPlanBlocks)}h</span>
                </div>
                <div className="rounded border border-zinc-200 bg-white py-2">
                  실행 <span className="text-blue-600">총 {calculateTotalHours(filteredExecutionBlocks)}h</span>
                </div>
              </div>

              {/* Timeline grids */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {/* Plan column */}
                <div
                  ref={planColumnRef}
                  className="relative overflow-hidden rounded border border-zinc-200 bg-white"
                  style={{ height: `${TOTAL_ROWS * SLOT_HEIGHT}px` }}
                  onMouseDown={(e) => handleSelectionStart(e, "plan")}
                  onTouchStart={(e) => handleSelectionStart(e, "plan")}
                >
                  {/* Grid lines - lines at :00 (hour) and :30 (half-hour) */}
                  {Array.from({ length: TOTAL_ROWS }).map((_, index) => {
                    // Line is drawn at bottom of each slot
                    // Slot 0 ends at 0:10, slot 2 ends at 0:30, slot 5 ends at 1:00, etc.
                    const slotEndMinutes = (index + 1) * MINUTES_PER_SLOT;
                    const isHourLine = slotEndMinutes % 60 === 0; // :00
                    const isHalfHourLine = slotEndMinutes % 30 === 0 && !isHourLine; // :30
                    return (
                      <div
                        key={index}
                        className={`absolute left-0 right-0 border-b ${isHourLine
                          ? "border-zinc-300"
                          : isHalfHourLine
                            ? "border-zinc-200"
                            : "border-dashed border-zinc-100"
                          }`}
                        style={{ top: `${(index + 1) * SLOT_HEIGHT}px` }}
                      />
                    );
                  })}
                  {/* Selection preview */}
                  {selecting?.type === "plan" && selectionPreview && (
                    <div
                      className="absolute left-1 right-1 bg-blue-200/50 border-2 border-blue-400 border-dashed rounded z-20"
                      style={{
                        top: `${selectionPreview.startSlot * SLOT_HEIGHT}px`,
                        height: `${(selectionPreview.endSlot - selectionPreview.startSlot) * SLOT_HEIGHT}px`,
                      }}
                    />
                  )}
                  {/* Plan blocks - with side-by-side layout for overlapping */}
                  {filteredPlanBlocks.map((block) => {
                    const top = (block.start / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                    const height = ((block.end - block.start) / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                    const laneInfo = planBlockLanes.get(block.id) || { lane: 0, totalLanes: 1 };
                    // Leave 15% space on the right for easier new block creation
                    const maxWidthPercent = 85;
                    const widthPercent = maxWidthPercent / laneInfo.totalLanes;
                    const leftPercent = laneInfo.lane * widthPercent;
                    return (
                      <div
                        key={block.id}
                        className={`absolute rounded px-1 py-0.5 text-left text-[10px] leading-tight font-semibold text-zinc-800 shadow-sm cursor-pointer select-none overflow-hidden flex flex-col ${block.color} ${draggingBlock?.id === block.id ? "opacity-70 ring-2 ring-blue-500 z-30" : "hover:ring-1 hover:ring-blue-300 z-10"
                          }`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                        }}
                        onMouseDown={(e) => handleBlockDragStart(e, block.id, "plan")}
                        onTouchStart={(e) => handleBlockDragStart(e, block.id, "plan")}
                        onClick={(e) => handleBlockClick(e, block, "plan")}
                      >
                        <div className="truncate font-bold">{block.title}</div>
                        {block.description && (
                          <div className="mt-auto whitespace-pre-line text-[9px] opacity-80 overflow-hidden line-clamp-2">{block.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Execution column */}
                <div
                  ref={executionColumnRef}
                  className="relative overflow-hidden rounded border border-zinc-200 bg-white"
                  style={{ height: `${TOTAL_ROWS * SLOT_HEIGHT}px` }}
                  onMouseDown={(e) => handleSelectionStart(e, "execution")}
                  onTouchStart={(e) => handleSelectionStart(e, "execution")}
                >
                  {/* Grid lines - lines at :00 (hour) and :30 (half-hour) */}
                  {Array.from({ length: TOTAL_ROWS }).map((_, index) => {
                    const slotEndMinutes = (index + 1) * MINUTES_PER_SLOT;
                    const isHourLine = slotEndMinutes % 60 === 0; // :00
                    const isHalfHourLine = slotEndMinutes % 30 === 0 && !isHourLine; // :30
                    return (
                      <div
                        key={index}
                        className={`absolute left-0 right-0 border-b ${isHourLine
                          ? "border-zinc-300"
                          : isHalfHourLine
                            ? "border-zinc-200"
                            : "border-dashed border-zinc-100"
                          }`}
                        style={{ top: `${(index + 1) * SLOT_HEIGHT}px` }}
                      />
                    );
                  })}
                  {/* Selection preview */}
                  {selecting?.type === "execution" && selectionPreview && (
                    <div
                      className="absolute left-1 right-1 bg-blue-200/50 border-2 border-blue-400 border-dashed rounded z-20"
                      style={{
                        top: `${selectionPreview.startSlot * SLOT_HEIGHT}px`,
                        height: `${(selectionPreview.endSlot - selectionPreview.startSlot) * SLOT_HEIGHT}px`,
                      }}
                    />
                  )}
                  {/* Execution blocks - with side-by-side layout for overlapping */}
                  {filteredExecutionBlocks.map((block) => {
                    const top = (block.start / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                    const height = ((block.end - block.start) / MINUTES_PER_SLOT) * SLOT_HEIGHT;
                    const laneInfo = executionBlockLanes.get(block.id) || { lane: 0, totalLanes: 1 };
                    // Leave 15% space on the right for easier new block creation
                    const maxWidthPercent = 85;
                    const widthPercent = maxWidthPercent / laneInfo.totalLanes;
                    const leftPercent = laneInfo.lane * widthPercent;
                    return (
                      <div
                        key={block.id}
                        className={`absolute rounded px-1 py-0.5 text-left text-[10px] leading-tight font-semibold text-zinc-800 shadow-sm cursor-pointer select-none overflow-hidden flex flex-col ${block.color} ${draggingBlock?.id === block.id ? "opacity-70 ring-2 ring-blue-500 z-30" : "hover:ring-1 hover:ring-blue-300 z-10"
                          }`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                        }}
                        onMouseDown={(e) => handleBlockDragStart(e, block.id, "execution")}
                        onTouchStart={(e) => handleBlockDragStart(e, block.id, "execution")}
                        onClick={(e) => handleBlockClick(e, block, "execution")}
                      >
                        <div className="truncate font-bold">{block.title}</div>
                        {block.description && (
                          <div className="mt-auto whitespace-pre-line text-[9px] opacity-80 overflow-hidden line-clamp-2">{block.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current time indicator */}
              <div
                className="pointer-events-none absolute left-0 right-0"
                style={{ top: `${currentRow * SLOT_HEIGHT + headerOffset}px` }}
              >
                <div className="relative">
                  <span className="absolute -left-12 -top-3 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {currentLabel}
                  </span>
                  <div className="h-0.5 w-full bg-red-500" />
                  <span className="absolute -left-5 -top-1.5 h-2 w-2 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fixed Bottom Navigation */}
        <nav className="shrink-0 border-t border-zinc-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            {[
              { label: "홈", icon: HomeIcon },
              { label: "Mission", icon: Target },
              { label: "Camera", icon: Camera, active: true },
              { label: "Chat", icon: MessageCircle },
              { label: "일정관리", icon: CalendarCheck },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${item.active ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-200"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className={item.active ? "text-blue-600" : ""}>{item.label}</span>
              </div>
            ))}
          </div>
        </nav>

        {/* Add/Edit Block Dialog */}
        <Dialog open={!!modalState} onOpenChange={(open) => !open && setModalState(null)}>
          <DialogContent className="max-w-[350px]">
            <DialogHeader>
              <DialogTitle>
                {modalState?.mode === "edit"
                  ? modalState?.isMultiDay
                    ? "여러 날 일정 수정"
                    : "일정 수정"
                  : modalState?.type === "plan"
                    ? "계획 추가"
                    : "실행 추가"}
              </DialogTitle>
              {modalState?.mode === "edit" && modalState?.isMultiDay && (
                <p className="text-sm text-zinc-500">
                  {modalState.startDate} ~ {modalState.endDate}
                </p>
              )}
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">제목</label>
                <Input
                  value={modalState?.title || ""}
                  onChange={(e) => setModalState(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="일정 제목"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">설명 (선택)</label>
                <Textarea
                  value={modalState?.description || ""}
                  onChange={(e) => setModalState(prev => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                  placeholder="상세 설명을 입력하세요"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">시작 시간</label>
                  <Select
                    value={String(modalState?.startMinutes || 0)}
                    onValueChange={(v) => setModalState(prev => prev ? { ...prev, startMinutes: Number(v) } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 * 6 }, (_, i) => i * 10).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {formatTimeFromMinutes(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">종료 시간</label>
                  <Select
                    value={String(modalState?.endMinutes || 0)}
                    onValueChange={(v) => setModalState(prev => prev ? { ...prev, endMinutes: Number(v) } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 * 6 }, (_, i) => i * 10).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {formatTimeFromMinutes(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">색상</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setModalState(prev => prev ? { ...prev, color } : null)}
                      className={`h-8 w-8 rounded ${color} ${modalState?.color === color ? "ring-2 ring-blue-500 ring-offset-2" : ""
                        }`}
                    />
                  ))}
                </div>
              </div>

              {modalState?.mode === "add" && modalState?.type === "plan" && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <input
                      type="checkbox"
                      checked={modalState?.isMultiDay || false}
                      onChange={(e) => setModalState(prev => prev ? { ...prev, isMultiDay: e.target.checked } : null)}
                      className="rounded border-zinc-300"
                    />
                    여러 날에 걸쳐 반복
                  </label>
                  {modalState?.isMultiDay && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">시작 날짜</label>
                        <Input
                          type="date"
                          value={modalState?.startDate || selectedDateStr}
                          onChange={(e) => setModalState(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">종료 날짜</label>
                        <Input
                          type="date"
                          value={modalState?.endDate || selectedDateStr}
                          onChange={(e) => setModalState(prev => prev ? { ...prev, endDate: e.target.value } : null)}
                          min={modalState?.startDate || selectedDateStr}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              {modalState?.mode === "edit" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={modalState?.isMultiDay ? handleDeleteMultiDayPlan : handleDeleteBlock}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> 삭제
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setModalState(null)}>취소</Button>
              <Button
                onClick={modalState?.mode === "edit" && modalState?.isMultiDay ? handleSaveMultiDayPlan : handleSaveBlock}
                disabled={!modalState?.title?.trim()}
              >
                {modalState?.mode === "edit" ? "저장" : "추가"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
