import { defineGoldens } from '../define';
import { artStates } from '../states';

defineGoldens(
  'pip-capybara in every mood and mouth',
  artStates().filter((s) => s.kind === 'critter' && s.character === 'pip-capybara'),
);
