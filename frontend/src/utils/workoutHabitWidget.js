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
