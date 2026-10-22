import { BlendColor, Canvas, Group, Paint } from '@shopify/react-native-skia';
import type { Character, SceneName } from '@yapling/art';
import { CritterArt } from '@yapling/art/native';
import type { CharacterId } from '@yapling/contracts';
import type { Place } from '@yapling/story';

/*
 * Where the later weeks' listening screens are set: each place's scene (the Inn borrows the street
 * until its own set exists), the scene behind a voicemail from each neighbour, and the next
 * episode's guest as a silhouette on the closing card.
 */

const PLACE_SCENES: Readonly<Record<Place, SceneName>> = {
  burrow: 'burrow',
  'lantern-cafe': 'cafe',
  'hollowbrook-office': 'office',
  'lantern-inn': 'street',
  'bus-45': 'bus',
  'town-square': 'square',
};

/** The scene a place is drawn with. */
export const sceneOfPlace = (place: Place): SceneName => PLACE_SCENES[place];

const HOME_SCENES: Partial<Readonly<Record<CharacterId, SceneName>>> = {
  pip: 'burrow',
  mei: 'cafe',
  hank: 'cafe',
  sol: 'office',
  dex: 'office',
  bea: 'bus',
  linh: 'street',
};

/** The scene behind a voicemail: where its sender is when they call. */
export const sceneOfSender = (from: CharacterId): SceneName => HOME_SCENES[from] ?? 'town';

/** The characters the art draws (the office's voices have no face: Pip stands in). */
export const drawable = (id: CharacterId): Character =>
  id === 'office' || id === 'mags' ? 'pip' : id;

/** A cast member in one flat colour: who's coming next, not yet shown. */
export function Silhouette({
  character,
  size,
  colour,
}: {
  character: CharacterId;
  size: number;
  colour: string;
}) {
  return (
    <Canvas style={{ width: size, height: size * 1.2 }}>
      <Group
        layer={
          <Paint>
            <BlendColor color={colour} mode="srcIn" />
          </Paint>
        }
      >
        <CritterArt character={drawable(character)} size={size} animated={false} />
      </Group>
    </Canvas>
  );
}
