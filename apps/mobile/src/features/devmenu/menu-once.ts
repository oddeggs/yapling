/*
 * The test menu is open at most once: a long press on the build label or a three-finger tap while
 * it is up (or on its way up) opens nothing more.
 */

let open = false;

/** Opens the menu with `push` unless it is open already; whether it opened. */
export function openMenuOnce(push: () => void): boolean {
  if (open) return false;
  open = true;
  push();
  return true;
}

/** The menu is on screen; the returned function marks it closed again. */
export function menuShown(): () => void {
  open = true;
  return () => {
    open = false;
  };
}
