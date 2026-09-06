import {
  Box,
  Flex,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useThemeColors } from "../hooks/useThemeColors";
import { useProductStore } from "../store/product";
import {
  addGregorianDaysToDateKey,
  canSyncWorkoutHabitWidget,
  fetchWorkoutHabitSummary,
  getCalendarDateKey,
  syncWorkoutHabitWidget,
} from "../utils/workoutHabitWidget";

const CELL_BORDER_WIDTH = "1.99px";
/** Darker than logo blue-300 so the highlight reads on dark surfaces. */
const HIGHLIGHT_BLUE = "var(--chakra-colors-blue-500)";
const SCRUB_MOVE_THRESHOLD_PX = 6;

const formatDayLabel = (ymdKey) => {
  if (!ymdKey) return "";
  const parts = String(ymdKey).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return ymdKey;
  }
  const [y, m, d] = parts;
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

const buildEmptyDays = () => {
  const todayKey = getCalendarDateKey();
  const windowStartKey = addGregorianDaysToDateKey(todayKey, -29);
  return Array.from({ length: 30 }, (_, index) => ({
    date: addGregorianDaysToDateKey(windowStartKey, index),
    workedOut: false,
    entryId: null,
    workoutName: null,
    workoutDescription: null,
    image: null,
    likes: [],
    comments: [],
    createdAt: null,
    uid: null,
  }));
};

export default function WorkoutHabitWidgetPreview({
  refreshKey,
  onDayDoubleClick,
}) {
  const summary = useProductStore((state) => state.workoutHabitSummary);
  const setWorkoutHabitSummary = useProductStore(
    (state) => state.setWorkoutHabitSummary,
  );
  const [isLoading, setIsLoading] = useState(!summary);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [pinnedDay, setPinnedDay] = useState(null);
  const [popupLeftPx, setPopupLeftPx] = useState(null);
  const gridRef = useRef(null);
  const popupRef = useRef(null);
  const daysRef = useRef([]);
  const pointerIdRef = useRef(null);
  const didScrubRef = useRef(false);
  const startPointRef = useRef({ x: 0, y: 0 });
  const scrollLockCleanupRef = useRef(null);
  const touchScrollLockRef = useRef({ active: false, y: 0 });
  const canSyncIosWidget = canSyncWorkoutHabitWidget();
  const colors = useThemeColors();
  const cellEmpty = "hsl(var(--card) / 0.92)";
  const cellActive = "hsl(var(--primary) / 0.11)";
  const activeCellBlur = "hsl(var(--primary) / 0.52)";

  const bindGridScrollLock = useCallback((node) => {
    scrollLockCleanupRef.current?.();
    scrollLockCleanupRef.current = null;
    gridRef.current = node;
    if (!node) return;

    const lock = touchScrollLockRef.current;
    const html = document.documentElement;
    const { body } = document;
    let previousHtmlOverflow = "";
    let previousBodyOverflow = "";
    let previousBodyOverscroll = "";

    const onTouchStart = () => {
      lock.active = true;
      lock.y = window.scrollY || window.pageYOffset || 0;
      previousHtmlOverflow = html.style.overflow;
      previousBodyOverflow = body.style.overflow;
      previousBodyOverscroll = body.style.overscrollBehavior;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
    };

    const unlock = () => {
      if (!lock.active) return;
      lock.active = false;
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };

    const onTouchMove = (event) => {
      if (!lock.active) return;
      // Must be non-passive; stops WKWebView page pan while scrubbing the grid.
      event.preventDefault();
      if ((window.scrollY || 0) !== lock.y) {
        window.scrollTo(0, lock.y);
      }
    };

    const onScroll = () => {
      if (!lock.active) return;
      window.scrollTo(0, lock.y);
    };

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", unlock);
    node.addEventListener("touchcancel", unlock);
    // Capture on document so the gesture can't escape to the page scroller.
    document.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("scroll", onScroll, { passive: true });

    scrollLockCleanupRef.current = () => {
      unlock();
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", unlock);
      node.removeEventListener("touchcancel", unlock);
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(
    () => () => {
      scrollLockCleanupRef.current?.();
      scrollLockCleanupRef.current = null;
    },
    [],
  );

  useEffect(() => {
    let ignore = false;

    const loadSummary = async () => {
      const hasSummary = Boolean(useProductStore.getState().workoutHabitSummary);
      if (!hasSummary) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const nextSummary = await fetchWorkoutHabitSummary();
        if (ignore) return;
        setWorkoutHabitSummary(nextSummary);
        if (!canSyncIosWidget) {
          return;
        }
        try {
          const summaryToSync =
            useProductStore.getState().workoutHabitSummary || nextSummary;
          const result = await syncWorkoutHabitWidget(summaryToSync);
          if (!ignore) setSyncStatus(result);
        } catch (syncError) {
          if (!ignore) {
            setSyncStatus(null);
            setError(syncError?.message || "Unable to sync iOS widget");
          }
        }
      } catch (err) {
        if (ignore) return;
        setError(err?.message || "Unable to load habit widget");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [canSyncIosWidget, refreshKey, setWorkoutHabitSummary]);

  useEffect(() => {
    if (!pinnedDay) return undefined;

    const onPointerDown = (event) => {
      if (gridRef.current?.contains(event.target)) return;
      setPinnedDay(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setPinnedDay(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pinnedDay]);

  const days = useMemo(
    () => summary?.workoutDays?.slice(-30) || buildEmptyDays(),
    [summary],
  );
  daysRef.current = days;

  const dayFromClientPoint = useCallback((clientX, clientY) => {
    const gridEl = gridRef.current?.querySelector("[data-habit-grid]");
    if (!gridEl) return null;

    const rect = gridEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    const list = daysRef.current;
    const cols = 10;
    const rows = Math.max(1, Math.ceil(list.length / cols));
    const col = Math.min(cols - 1, Math.max(0, Math.floor((x / rect.width) * cols)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor((y / rect.height) * rows)));
    const index = row * cols + col;
    if (index < 0 || index >= list.length) return null;
    return list[index];
  }, []);

  const endScrub = useCallback(
    (event, { pin } = { pin: false }) => {
      if (pointerIdRef.current !== event.pointerId) return;
      pointerIdRef.current = null;

      const day = dayFromClientPoint(event.clientX, event.clientY);
      if (pin && day) {
        if (didScrubRef.current) {
          setPinnedDay(day);
          setHoveredDay(day);
        } else {
          setPinnedDay((prev) => (prev?.date === day.date ? null : day));
          setHoveredDay(day);
        }
      }

      didScrubRef.current = false;
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        // ignore
      }
    },
    [dayFromClientPoint],
  );

  const onGridPointerDown = useCallback(
    (event) => {
      if (event.button != null && event.button !== 0) return;

      pointerIdRef.current = event.pointerId;
      didScrubRef.current = false;
      startPointRef.current = { x: event.clientX, y: event.clientY };

      const day = dayFromClientPoint(event.clientX, event.clientY);
      if (day) setHoveredDay(day);

      // Capture immediately so vertical scrub doesn't scroll the page underneath.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore
      }
    },
    [dayFromClientPoint],
  );

  const onGridPointerMove = useCallback(
    (event) => {
      // Idle mouse: highlight under cursor without pressing.
      if (pointerIdRef.current !== event.pointerId) {
        if (event.pointerType === "mouse" && pointerIdRef.current == null) {
          setHoveredDay(dayFromClientPoint(event.clientX, event.clientY));
        }
        return;
      }

      const dx = event.clientX - startPointRef.current.x;
      const dy = event.clientY - startPointRef.current.y;
      if (
        !didScrubRef.current &&
        Math.hypot(dx, dy) > SCRUB_MOVE_THRESHOLD_PX
      ) {
        didScrubRef.current = true;
      }

      const day = dayFromClientPoint(event.clientX, event.clientY);
      if (day) setHoveredDay(day);

      // Block page scroll while dragging across cells (including vertically).
      if (didScrubRef.current) {
        event.preventDefault();
      }
    },
    [dayFromClientPoint],
  );

  const onGridDoubleClick = useCallback(
    (event) => {
      const day = dayFromClientPoint(event.clientX, event.clientY);
      if (!day?.workedOut || !day.entryId) return;
      if (String(day.entryId).startsWith("optimistic-")) return;
      event.preventDefault();
      setPinnedDay(null);
      setHoveredDay(null);
      onDayDoubleClick?.(day);
    },
    [dayFromClientPoint, onDayDoubleClick],
  );

  const workoutCount = summary?.workoutCount30d ?? 0;
  const currentStreak = summary?.currentStreak ?? 0;
  const widgetSyncLabel = (() => {
    if (!canSyncIosWidget) {
      return null;
    }
    if (syncStatus?.saved) {
      return `Synced ${syncStatus.activeDaysCount ?? workoutCount} active days to iOS widget`;
    }
    if (syncStatus?.skipped) {
      return `Widget sync skipped: ${syncStatus.reason}`;
    }
    if (syncStatus == null && !isLoading && summary) {
      return "Widget sync did not return a native result";
    }
    return "Syncing iOS widget...";
  })();

  const activeDay = hoveredDay || pinnedDay;
  const activeDayIndex = activeDay
    ? days.findIndex((day) => day.date === activeDay.date)
    : -1;
  const popupTitle = activeDay?.workedOut
    ? activeDay.workoutName || "Workout"
    : "No workout";

  useLayoutEffect(() => {
    if (!activeDay || activeDayIndex < 0) {
      setPopupLeftPx(null);
      return;
    }

    const gridEl = gridRef.current;
    const popupEl = popupRef.current;
    if (!gridEl || !popupEl || typeof window === "undefined") return;

    const col = activeDayIndex % 10;
    const gridRect = gridEl.getBoundingClientRect();
    const popupWidth = popupEl.offsetWidth || 0;
    const pad = 10;
    const viewportWidth = window.innerWidth;
    const half = popupWidth / 2;

    // Prefer sitting over the cell; only nudge inward when it would clip.
    let anchorX = ((col + 0.5) / 10) * gridRect.width;
    const minAnchor = pad - gridRect.left + half;
    const maxAnchor = viewportWidth - pad - gridRect.left - half;
    if (maxAnchor >= minAnchor) {
      anchorX = Math.min(Math.max(anchorX, minAnchor), maxAnchor);
    }

    setPopupLeftPx(anchorX);
  }, [activeDay, activeDayIndex, popupTitle]);

  return (
    <Box
      w="full"
      maxW="720px"
      mx="auto"
      borderRadius="8px"
      border="1px solid"
      borderColor={colors.borderColor}
      bg={colors.bgCard}
      color={colors.textPrimary}
      p={{ base: 4, md: 5 }}
      textAlign="left"
      shadow="xl"
    >
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="flex-start" gap={4}>
          <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold">
            Workout widget
          </Text>
          <Box textAlign="right">
            <Text fontSize="2xl" fontWeight="black" lineHeight="1">
              {currentStreak}
            </Text>
            <Text color={colors.textMuted} fontSize="xs" textTransform="uppercase">
              streak
            </Text>
          </Box>
        </Flex>

        <Skeleton isLoaded={!isLoading || Boolean(summary)} rounded="0">
          <Box
            ref={bindGridScrollLock}
            position="relative"
            aria-label="Last 30 days workout chart"
            style={{
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTouchCallout: "none",
            }}
            onPointerDown={onGridPointerDown}
            onPointerMove={onGridPointerMove}
            onPointerUp={(event) => endScrub(event, { pin: true })}
            onPointerCancel={(event) => endScrub(event, { pin: false })}
            onDoubleClick={onGridDoubleClick}
            onPointerLeave={(event) => {
              // Keep scrubbing while captured; only clear idle mouse hover.
              if (pointerIdRef.current != null) return;
              if (event.pointerType === "mouse") {
                setHoveredDay(null);
              }
            }}
          >
            <Box
              data-habit-grid
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap="3px"
            >
              {days.map((day) => {
                const isHighlighted =
                  activeDay?.date === day.date || pinnedDay?.date === day.date;
                return (
                  <Box
                    key={day.date}
                    as="button"
                    type="button"
                    data-habit-day={day.date}
                    title={
                      day.workedOut
                        ? `${formatDayLabel(day.date)}: ${day.workoutName || "Workout"}`
                        : `${formatDayLabel(day.date)}: No workout`
                    }
                    aria-label={
                      day.workedOut
                        ? `${formatDayLabel(day.date)}, ${day.workoutName || "Workout"}`
                        : `${formatDayLabel(day.date)}, no workout`
                    }
                    aria-pressed={pinnedDay?.date === day.date}
                    aspectRatio="1"
                    borderRadius="4px"
                    border={`${CELL_BORDER_WIDTH} solid`}
                    borderColor={isHighlighted ? HIGHLIGHT_BLUE : "transparent"}
                    bg={day.workedOut ? cellActive : cellEmpty}
                    cursor="pointer"
                    outline="none"
                    transition="border-color 120ms ease"
                    tabIndex={-1}
                    _focusVisible={{
                      boxShadow: `0 0 0 2px ${HIGHLIGHT_BLUE}`,
                    }}
                  />
                );
              })}
            </Box>
            <Box
              position="absolute"
              inset={0}
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap="3px"
              filter="blur(9px)"
              transform="translateX(4px)"
              opacity={0.85}
              pointerEvents="none"
            >
              {days.map((day) => (
                <Box
                  key={`${day.date}-near-blur`}
                  aspectRatio="1"
                  borderRadius="4px"
                  bg={day.workedOut ? activeCellBlur : "transparent"}
                />
              ))}
            </Box>
            <Box
              position="absolute"
              inset={0}
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap="3px"
              filter="blur(18px)"
              transform="translateX(8px)"
              opacity={0.8}
              pointerEvents="none"
            >
              {days.map((day) => (
                <Box
                  key={`${day.date}-tight-blur`}
                  aspectRatio="1"
                  borderRadius="4px"
                  bg={day.workedOut ? activeCellBlur : "transparent"}
                />
              ))}
            </Box>
            <Box
              position="absolute"
              inset={0}
              display="grid"
              gridTemplateColumns="repeat(10, minmax(0, 1fr))"
              gap="3px"
              filter="blur(52px)"
              transform="translateX(22px)"
              opacity={0.65}
              pointerEvents="none"
            >
              {days.map((day) => (
                <Box
                  key={`${day.date}-wide-blur`}
                  aspectRatio="1"
                  borderRadius="4px"
                  bg={day.workedOut ? activeCellBlur : "transparent"}
                />
              ))}
            </Box>

            {activeDay && activeDayIndex >= 0 ? (
              <Box
                ref={popupRef}
                position="absolute"
                zIndex={2}
                left={
                  popupLeftPx == null
                    ? `${((activeDayIndex % 10) + 0.5) * 10}%`
                    : `${popupLeftPx}px`
                }
                top={`${(Math.floor(activeDayIndex / 10) + 0.15) * (100 / Math.ceil(days.length / 10))}%`}
                style={{ transform: "translate(-50%, -110%)" }}
                px={2.5}
                py={1.5}
                borderRadius="6px"
                border="1px solid"
                borderColor={colors.borderColor}
                bg={colors.bgCard}
                color={colors.textPrimary}
                shadow="md"
                w="max-content"
                maxW={{ base: "min(15rem, calc(100vw - 1.25rem))", md: "14rem" }}
                pointerEvents="none"
              >
                <Text fontSize="xs" fontWeight="semibold" noOfLines={2}>
                  {popupTitle}
                </Text>
                <Text fontSize="xs" color={colors.textMuted} mt={0.5}>
                  {formatDayLabel(activeDay.date)}
                </Text>
              </Box>
            ) : null}
          </Box>
        </Skeleton>

        <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
          <Text color={colors.textMuted} fontSize="sm">
            {workoutCount} of 30 days
          </Text>
          {(error || widgetSyncLabel) && (
            <Text color={error ? "red.400" : colors.textMuted} fontSize="sm">
              {error || widgetSyncLabel}
            </Text>
          )}
        </Flex>
      </VStack>
    </Box>
  );
}
