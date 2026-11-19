import { useProductStore } from "../store/product";

/**
 * App-wide signed-in signal for chrome (dock, guest landing).
 * Prefers Mongo bootstrap (`currentUserInfo`) and falls back to session user.
 */
export function useIsSignedIn() {
  const currentUser = useProductStore((s) => s.currentUser);
  const currentUserInfo = useProductStore((s) => s.currentUserInfo);
  return Boolean(currentUser || currentUserInfo);
}
