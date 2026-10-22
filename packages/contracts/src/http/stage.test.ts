import { describeSchemas } from '../schema-runner.test-data';
import * as stage from './stage';

describeSchemas('stage', stage, {
  StageRequestReason: [[...stage.STAGE_REQUEST_REASONS], ['too-hard', 'placement', '']],
  StageRequest: [
    [
      { to: 'visitor', reason: 'self_select' },
      { to: 'visitor', reason: 'too_hard' },
      { to: 'newcomer', reason: 'too_easy' },
      { to: 'newcomer', reason: 'stage_up' },
      { to: 'visitor', reason: 'stay' },
    ],
    [{ to: 'beginner', reason: 'too_hard' }, { to: 'visitor' }, { reason: 'stay' }, {}],
  ],
});
