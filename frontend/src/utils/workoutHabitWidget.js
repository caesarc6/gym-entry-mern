import { Capacitor, registerPlugin } from "@capacitor/core";
import { API_ENDPOINTS, apiClient } from "../config/api";

const WorkoutWidget = registerPlugin("WorkoutWidget");

export function canSyncWorkoutHabitWidget() {
  if (typeof window === "undefined") return false;

  const isNative =
    typeof Capacitor.isNativePlatform === "function" &&
    Capacitor.isNativePlatform();
  const platform =
    typeof Capacitor.getPlatform === "function"
      ? Capacitor.getPlatform()
      : window.Capacitor?.getPlatform?.();

  return isNative && platform === "ios";
}

export function getCalendarDateKey(date = new Date()) {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }

  let calendarTz = "UTC";
  try {
    calendarTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    calendarTz = "UTC";
  }

  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  if (calendarTz === "UTC") {
    return d.toISOString().slice(0, 10);
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: calendarTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export const addGregorianDaysToDateKey = (ymdKey, deltaDays) => {
  const parts = String(ymdKey).split("-").map(Number);
  if (
    parts.length !== 3 ||
    parts.some((n) => !Number.isFinite(n))
  ) {
    return new Date().toISOString().slice(0, 10);
  }
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

export function buildEmptyWorkoutHabitSummary() {
  const todayKey = getCalendarDateKey();
  const windowStartKey = addGregorianDaysToDateKey(todayKey, -29);
  const workoutDays = Array.from({ length: 30 }, (_, index) => ({
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

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 30,
    today: todayKey,
    lastWorkoutName: null,
    lastWorkoutAt: null,
    workoutDays,
    workoutCount30d: 0,
    currentStreak: 0,
  };
}

export function applyOptimisticWorkoutToSummary(summary, workout) {
  const currentTodayKey = getCalendarDateKey();
  const base =
    summary?.workoutDays && Array.isArray(summary.workoutDays)
      ? summary
      : buildEmptyWorkoutHabitSummary();

  const workoutAt = workout?.createdAt
    ? new Date(workout.createdAt)
    : new Date();
  const workoutDayKey = Number.isNaN(workoutAt.getTime())
    ? currentTodayKey
    : getCalendarDateKey(workoutAt);

  // Realign existing workoutDays if base.today is behind current calendar day
  const existingDaysMap = new Map(
    (base.workoutDays || []).map((day) => [day.date, day]),
  );
  const windowStartKey = addGregorianDaysToDateKey(currentTodayKey, -29);
  const alignedDays = Array.from({ length: 30 }, (_, index) => {
    const date = addGregorianDaysToDateKey(windowStartKey, index);
    return (
      existingDaysMap.get(date) || {
        date,
        workedOut: false,
        entryId: null,
        workoutName: null,
        workoutDescription: null,
        image: null,
        likes: [],
        comments: [],
        createdAt: null,
        uid: null,
      }
    );
  });

  const alreadyWorked = alignedDays.some(
    (day) => day.date === workoutDayKey && day.workedOut,
  );

  const workoutDays = alignedDays.map((day) =>
    day.date === workoutDayKey
      ? {
          ...day,
          workedOut: true,
          entryId: workout?._id ? String(workout._id) : day.entryId || null,
          workoutName: workout?.name || day.workoutName || "Workout",
          workoutDescription:
            typeof workout?.description === "string"
              ? workout.description
              : day.workoutDescription || null,
          image: workout?.image ?? day.image ?? null,
          likes: Array.isArray(workout?.likes) ? workout.likes : day.likes || [],
          comments: Array.isArray(workout?.comments)
            ? workout.comments
            : day.comments || [],
          createdAt: workout?.createdAt || day.createdAt || null,
          uid: workout?.uid || workout?.ownerId || day.uid || null,
        }
      : day,
  );

  let currentStreak = base.currentStreak ?? 0;
  if (!alreadyWorked && workoutDayKey === currentTodayKey) {
    const workedSet = new Set(
      workoutDays.filter((day) => day.workedOut).map((day) => day.date),
    );
    currentStreak = 0;
    let probe = currentTodayKey;
    while (workedSet.has(probe)) {
      currentStreak += 1;
      probe = addGregorianDaysToDateKey(probe, -1);
    }
  }

  return {
    ...base,
    generatedAt: new Date().toISOString(),
    today: currentTodayKey,
    lastWorkoutName: workout?.name || base.lastWorkoutName || null,
    lastWorkoutAt:
      workout?.createdAt ||
      base.lastWorkoutAt ||
      new Date().toISOString(),
    workoutDays,
    workoutCount30d: workoutDays.filter((day) => day.workedOut).length,
    currentStreak,
  };
}

export async function fetchWorkoutHabitSummary() {
  let calendarTz = "UTC";
  try {
    calendarTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    calendarTz = "UTC";
  }

  const response = await apiClient.get(API_ENDPOINTS.WORKOUT_HABIT_SUMMARY, {
    headers: {
      "x-workout-calendar-tz": calendarTz,
    },
  });
  const data = response.data;

  if (!data?.success) {
    throw new Error(data?.message || "Failed to load workout habit summary");
  }

  return data.data;
}

export async function syncWorkoutHabitWidget(summary) {
  if (!summary || !canSyncWorkoutHabitWidget()) {
    return { skipped: true, reason: "not-ios-native" };
  }

  return WorkoutWidget.updateSummary({ summary });
}
