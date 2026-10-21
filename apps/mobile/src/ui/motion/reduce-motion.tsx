import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const ReduceMotionContext = createContext<boolean | null>(null);

/**
 * Reduce Motion, read once for the whole app and kept current when it changes in Settings. Under
 * it nothing slides, pops, sways or glows: moves become fades of the same length and loops hold
 * still.
 */
export function ReduceMotionProvider({
  forced,
  children,
}: {
  /** Fixes the setting for a subtree (the component kit's Reduce Motion switch). */
  readonly forced?: boolean | undefined;
  readonly children: ReactNode;
}) {
  // Reanimated reads the setting synchronously at startup, so the first frame is already right.
  const initial = useReducedMotion();
  const [reduce, setReduce] = useState(initial);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    return () => sub.remove();
  }, []);
  return (
    <ReduceMotionContext.Provider value={forced ?? reduce}>{children}</ReduceMotionContext.Provider>
  );
}

/** Whether Reduce Motion is on. */
export function useReduceMotion(): boolean {
  const reduce = useContext(ReduceMotionContext);
  if (reduce === null) throw new Error('useReduceMotion needs a ReduceMotionProvider');
  return reduce;
}
