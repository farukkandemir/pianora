import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Opaque full-screen curtain that hides orientation changes.
 *
 * The Library raises it before opening the practice screen (a landscape
 * full-screen modal) and the tab shell lowers it once it is back on screen
 * in portrait. The window rotates while nothing but the curtain is visible,
 * the same trick video apps use: go dark, rotate, fade the player in.
 * Native modals render above the React root, so the curtain only ever covers
 * the portrait screens beneath them, never the practice screen itself.
 */
type CurtainApi = {
  /** Fade the curtain in; resolves once it is fully opaque. */
  raise: () => Promise<void>;
  /** Fade the curtain out. No-op when it is not up. */
  lower: () => void;
};

const CurtainContext = createContext<CurtainApi | null>(null);

export function CurtainProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const raise = useCallback(
    () =>
      new Promise<void>((resolve) => {
        setVisible(true);
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => resolve());
      }),
    [opacity],
  );

  const lower = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [opacity]);

  const api = useMemo(() => ({ raise, lower }), [raise, lower]);

  return (
    <CurtainContext.Provider value={api}>
      {children}
      {visible ? (
        <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, { backgroundColor: colors.curtain, opacity }]} />
      ) : null}
    </CurtainContext.Provider>
  );
}

export function useCurtain(): CurtainApi {
  const api = useContext(CurtainContext);
  if (!api) throw new Error('useCurtain must be used inside CurtainProvider');
  return api;
}
