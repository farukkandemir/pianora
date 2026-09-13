import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { coverFile } from '@/data/files';
import { useTheme } from '@/theme';

/**
 * Artwork tile for a piece. Shows the downloaded cover when the piece has one.
 * Otherwise a quiet diagonal gradient between two muted tones chosen from the
 * song id: distinct per piece, the same between launches, and clearly "no
 * cover yet" next to a painted one.
 */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type SongArtProps = {
  songId: string;
  /** File name in the covers folder, from `SongRecord.coverFile`. */
  cover?: string | null;
  /** Fixed width, or omit to fill the parent. */
  width?: number;
  height: number;
  radius?: number;
  style?: ViewStyle;
};

export function SongArt({ songId, cover, width, height, radius, style }: SongArtProps) {
  const { radius: r, artTints } = useTheme();
  const [from, to] = artTints[hash(songId) % artTints.length];
  return (
    <View
      style={[
        { width: width ?? '100%', height, borderRadius: radius ?? r.md, backgroundColor: to },
        { experimental_backgroundImage: `linear-gradient(135deg, ${from}, ${to})` },
        styles.clip,
        style,
      ]}
    >
      {cover ? (
        <Image source={{ uri: coverFile(cover).uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
