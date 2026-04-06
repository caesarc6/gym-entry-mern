/**
 * Helper function to get current user UID from browser console
 * 
 * Usage in browser console:
 *   import('/src/utils/getMyUID.js').then(m => m.getMyUID().then(console.log))
 * 
 * Or expose to window for easier access:
 *   window.getMyUID = async () => {
 *     const { getMyUID } = await import('/src/utils/getMyUID.js');
 *     return getMyUID();
 *   }
 */

import { supabase } from "../supabase/supabase";
import { getCurrentAuthUser } from "./auth";

/**
 * Get current user UID (works from browser console)
 */
export const getMyUID = async () => {
  try {
    // Try Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return {
        uid: user.id,
        email: user.email,
        provider: "supabase"
      };
    }

    // Try using the auth utility
    const authUser = await getCurrentAuthUser();
    if (authUser) {
      return {
        uid: authUser.uid,
        email: authUser.email,
        provider: authUser.authProvider
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting UID:", error);
    return null;
  }
};

// Expose to window for easy console access
if (typeof window !== "undefined") {
  window.getMyUID = getMyUID;
}
