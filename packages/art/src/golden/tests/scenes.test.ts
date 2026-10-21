import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'scenes and burrow objects',
  artStates().filter((s) => s.kind === 'scene' || s.kind === 'object'),
);
