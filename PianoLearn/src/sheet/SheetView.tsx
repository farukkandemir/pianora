import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SHEET_VIEWER_HTML } from './viewerHtml.generated';

export interface SheetViewHandle {
  load(xml: string, zoom?: number): void;
  /** Move the cursor to a 0-based measure and quarter-note offset within it. */
  setCursor(measureIndex: number, offsetQuarters: number): void;
  next(): void;
  setZoom(zoom: number): void;
  highlightRange(start: number | null, end: number | null): void;
  /** Keep the start of the music clear of the camera island. */
  setPadding(left: number, right: number): void;
}

export type SheetMessage =
  | { type: 'ready' }
  | { type: 'loaded'; measures: number }
  | { type: 'cursor'; measureIndex: number; rect: { top: number; left: number; height: number } | null }
  | { type: 'measureTap'; measureIndex: number }
  | { type: 'error'; message: string };

interface Props {
  onMessage?: (msg: SheetMessage) => void;
  style?: object;
}

export const SheetView = forwardRef<SheetViewHandle, Props>(function SheetView({ onMessage, style }, ref) {
  const web = useRef<WebView>(null);

  const call = useCallback((fn: string, ...args: unknown[]) => {
    const js = `window.api && window.api.${fn}(${args.map((a) => JSON.stringify(a)).join(',')}); true;`;
    web.current?.injectJavaScript(js);
  }, []);

  useImperativeHandle(ref, () => ({
    load: (xml, zoom) => call('load', xml, zoom ?? 0.6),
    setCursor: (m, off) => call('setCursor', m, off),
    next: () => call('next'),
    setZoom: (z) => call('setZoom', z),
    highlightRange: (s, e) => call('highlightRange', s, e),
    setPadding: (l, r) => call('setPadding', l, r),
  }), [call]);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      onMessage?.(JSON.parse(e.nativeEvent.data) as SheetMessage);
    } catch {
      // ignore malformed
    }
  }, [onMessage]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html: SHEET_VIEWER_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled
        scrollEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        style={styles.web}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  web: { flex: 1, backgroundColor: '#fff' },
});
