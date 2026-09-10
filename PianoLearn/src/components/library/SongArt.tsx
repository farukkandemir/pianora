import { useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Artwork tile for a piece. Until per-piece illustrations exist, this shows a
 * deterministic crop of the app illustration chosen from the song id, so each
 * piece looks distinct and stays the same between launches.
 */
const ART = require('../../../assets/images/hero-piano.jpg');
const ART_W = 1087;
const ART_H = 1447;

/** Crops as [x, y, w] in source pixels; height follows the tile's aspect. */
const CROPS: [number, number, number][] = [
  [560, 60, 520],   // arch, sky and sun
  [40, 160, 560],   // framed print and plant
  [430, 700, 650],  // piano keys and lid
  [520, 320, 560],  // lake and cypresses
  [0, 900, 700],    // bench on the floor
  [300, 500, 700],  // wall light and piano corner
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type SongArtProps = {
  songId: string;
  /** Fixed width, or omit to fill the parent (measured at layout). */
  width?: number;
  height: number;
  radius?: number;
  style?: ViewStyle;
};

export function SongArt({ songId, width: fixedWidth, height, radius, style }: SongArtProps) {
  const { radius: r, colors } = useTheme();
  const [measured, setMeasured] = useState(0);
  const width = fixedWidth ?? measured;
  const onLayout = fixedWidth ? undefined : (e: LayoutChangeEvent) => setMeasured(e.nativeEvent.layout.width);
  const [cx, cy, cw] = CROPS[hash(songId) % CROPS.length];
  const scale = width / cw;
  const ch = width > 0 ? height / scale : 0;
  const cyClamped = Math.min(cy, ART_H - ch);
  return (
    <View
      onLayout={onLayout}
      style={[{ width: fixedWidth ?? '100%', height, borderRadius: radius ?? r.md, backgroundColor: colors.surfaceMuted }, styles.clip, style]}
    >
      {width > 0 ? (
        <Image
          source={ART}
          style={{ position: 'absolute', left: -cx * scale, top: -cyClamped * scale, width: ART_W * scale, height: ART_H * scale }}
          resizeMode="stretch"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
