import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'faces in every mood',
  artStates().filter((s) => s.kind === 'face'),
);
