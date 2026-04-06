import { API_ENDPOINTS, apiClient } from "../config/api";

export const maybeMigrateAccount = async (userData) => {
  if (!userData) return null;

  const shouldMigrate =
    userData.authProvider === "firebase" &&
    userData.supabaseUid &&
    userData.uid &&
    userData.uid !== userData.supabaseUid;

  if (!shouldMigrate) {
    return null;
  }

  try {
    const response = await apiClient.post(API_ENDPOINTS.MIGRATION_LINK, {
      firebaseUid: userData.firebaseUid || userData.uid,
    });
    return response?.data || null;
  } catch (error) {
    // Migration is optional; return null if it fails.
    return null;
  }
};
