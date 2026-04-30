import { Capacitor, registerPlugin } from "@capacitor/core";
import { API_ENDPOINTS, apiClient } from "../config/api";

const WorkoutWidget = registerPlugin("WorkoutWidget");

export async function fetchWorkoutHabitSummary() {
  const response = await apiClient.get(API_ENDPOINTS.WORKOUT_HABIT_SUMMARY);
  const data = response.data;

  if (!data?.success) {
    throw new Error(data?.message || "Failed to load workout habit summary");
  }

  return data.data;
}

export async function syncWorkoutHabitWidget(summary) {
  if (!summary || !Capacitor.isNativePlatform?.()) return;
  if (Capacitor.getPlatform?.() !== "ios") return;

  try {
    await WorkoutWidget.updateSummary({ summary });
  } catch (error) {
    // Widget sync should never block the in-app habit card.
    console.warn("Failed to sync workout widget:", error);
  }
}
