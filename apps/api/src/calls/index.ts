import { registerDeletionStep } from '../account';

export { callRecordRoutes } from './routes';
export { insertCall, listCalls, getCallRow, storeSummary, recordOf } from './store';

// Transcripts live under the learner's blob prefix, which deletion empties; the rows go here.
registerDeletionStep('calls', (db, userId) => [
  db.prepare('DELETE FROM call_costs WHERE user_id = ?').bind(userId),
  db.prepare('DELETE FROM calls WHERE user_id = ?').bind(userId),
]);
