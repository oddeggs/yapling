import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'linh in every mood and mouth',
  artStates().filter((s) => s.kind === 'critter' && s.character === 'linh'),
);
