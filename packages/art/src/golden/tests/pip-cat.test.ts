import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'pip-cat in every mood and mouth',
  artStates().filter((s) => s.kind === 'critter' && s.character === 'pip-cat'),
);
