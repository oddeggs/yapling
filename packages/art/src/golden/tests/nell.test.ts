import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'nell in every mood and mouth',
  artStates().filter((s) => s.kind === 'critter' && s.character === 'nell'),
);
