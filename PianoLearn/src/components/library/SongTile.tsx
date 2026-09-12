import { Button, ContextMenu, Host, VStack } from '@expo/ui/swift-ui';
import { clipShape, frame } from '@expo/ui/swift-ui/modifiers';
import { Pressable, View } from 'react-native';

import type { SongListItem } from '@/data/songs';
import { composerSurname } from '@/lib/format';
import { useTheme } from '@/theme';
import { Text } from '@/ui';
import { SongArt } from './SongArt';

export type SongTileProps = {
  song: SongListItem;
  /** Tile width; the artwork is square and the text sits below it. */
  width: number;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/**
 * A piece in the library grid. Tap opens practice; long press lifts the
 * artwork into the native iOS context menu (Practice, Rename, Delete). The
 * menu is SwiftUI via @expo/ui, so the artwork is hosted in a fixed-size
 * `Host`; the React Native view inside is what the user sees and taps. No
 * pressed style: nothing may change under the finger before iOS decides
 * between tap and long press.
 */
export function SongTile({ song, width, onOpen, onRename, onDelete }: SongTileProps) {
  const { radius, spacing } = useTheme();
  const status = song.progress ? `Bar ${song.progress.lastMeasure + 1} of ${song.totalMeasures}` : 'Not started';
  return (
    <View style={{ width }}>
      {/* Only the artwork lives in the SwiftUI host: what you press is what lifts,
          so the lift animation never changes size. The text stays on the page. */}
      <Host style={{ width, height: width }}>
        <ContextMenu>
          <ContextMenu.Items>
            <Button label="Practice" systemImage="play" onPress={onOpen} />
            <Button label="Rename" systemImage="pencil" onPress={onRename} />
            <Button label="Delete" systemImage="trash" role="destructive" onPress={onDelete} />
          </ContextMenu.Items>
          <ContextMenu.Preview>
            <VStack modifiers={[frame({ width, height: width }), clipShape('roundedRectangle', radius.lg)]}>
              <SongArt songId={song.id} width={width} height={width} radius={radius.lg} />
            </VStack>
          </ContextMenu.Preview>
          <ContextMenu.Trigger>
            {/* onLongPress is a no-op on purpose: once the press lasts long enough for
                the system menu, React Native drops the tap, so practice opens on tap only. */}
            <Pressable onPress={onOpen} onLongPress={() => {}} delayLongPress={250} style={{ width, height: width }}>
              <SongArt songId={song.id} width={width} height={width} radius={radius.lg} />
            </Pressable>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
      <Pressable onPress={onOpen}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ paddingTop: spacing.sm }}>{song.title}</Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>{composerSurname(song.composer)} · {status}</Text>
      </Pressable>
    </View>
  );
}
