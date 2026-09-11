import { useEffect } from 'react';
import { AppState } from 'react-native';

import { reconnectKnownDevices } from '../../modules/piano-midi';

/**
 * Reconnects remembered Bluetooth keyboards when the app launches and every
 * time it returns to the foreground. Mount once, at the root.
 */
export function useMidiAutoReconnect(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const kick = () => { reconnectKnownDevices().catch(() => {}); };
    kick();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') kick();
    });
    return () => sub.remove();
  }, [enabled]);
}
