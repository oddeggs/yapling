import type { WithSpringConfig } from 'react-native-reanimated';

/*
 * The rewrite's look: near-black, bone and ember (only for "you are speaking"), a book serif for
 * spoken words and titles, the system face small and tracked for everything else. Everything
 * moves on springs.
 */

export const C = {
  bg: '#09080b',
  bone: '#f0ebe2',
  dim: 'rgba(240,235,226,0.62)',
  faint: 'rgba(240,235,226,0.36)',
  hair: 'rgba(240,235,226,0.12)',
  ember: '#ff5b45',
  panel: 'rgba(255,255,255,0.06)',
  danger: '#ff8a78',
} as const;

export const F = {
  serif: 'ui-serif',
} as const;

export const SPRING: WithSpringConfig = { damping: 18, stiffness: 190, mass: 1 };
export const SOFT: WithSpringConfig = { damping: 26, stiffness: 120, mass: 1 };
export const SNAP: WithSpringConfig = { damping: 16, stiffness: 320, mass: 0.8 };

/** Tracked capitals for small labels ("THE BURROW · 11:24 PM"). */
export const label = {
  fontSize: 10.5,
  fontWeight: '600' as const,
  letterSpacing: 2.1,
  textTransform: 'uppercase' as const,
  color: C.dim,
};
