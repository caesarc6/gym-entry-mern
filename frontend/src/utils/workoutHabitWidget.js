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
  let calendarTz = "UTC";
  try {
    calendarTz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    calendarTz = "UTC";
  }

  if (calendarTz === "UTC") {
    return date.toISOString().slice(0, 10);
  }

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: calendarTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
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
  const base =
    summary?.workoutDays && Array.isArray(summary.workoutDays)
      ? summary
      : buildEmptyWorkoutHabitSummary();

  const workoutAt = workout?.createdAt
    ? new Date(workout.createdAt)
    : new Date();
  const workoutDayKey = Number.isNaN(workoutAt.getTime())
    ? getCalendarDateKey()
    : getCalendarDateKey(workoutAt);
  const todayKey = base.today || getCalendarDateKey();
  const alreadyWorked = (base.workoutDays || []).some(
    (day) => day.date === workoutDayKey && day.workedOut,
  );

  const workoutDays = (base.workoutDays || []).map((day) =>
    day.date === workoutDayKey ? { ...day, workedOut: true } : day,
  );

  let currentStreak = base.currentStreak ?? 0;
  if (!alreadyWorked && workoutDayKey === todayKey) {
    const workedSet = new Set(
      workoutDays.filter((day) => day.workedOut).map((day) => day.date),
    );
    currentStreak = 0;
    let probe = todayKey;
    while (workedSet.has(probe)) {
      currentStreak += 1;
      probe = addGregorianDaysToDateKey(probe, -1);
    }
  }

  return {
    ...base,
    generatedAt: new Date().toISOString(),
    today: todayKey,
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
