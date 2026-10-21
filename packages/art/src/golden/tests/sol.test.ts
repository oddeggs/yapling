import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'sol in every mood and mouth',
  artStates().filter((s) => s.kind === 'critter' && s.character === 'sol'),
);
