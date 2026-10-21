import { createApp } from './app';
import type { Bindings } from './env';
import { consumeQueue } from './queues';

// Durable Object classes are exported from the entry, as `wrangler.jsonc` names them.
export { CallDO } from './call/call-object';
export { UserDO } from './user/user-object';

const app = createApp();

export default {
  fetch: app.fetch,
  queue: consumeQueue,
} satisfies ExportedHandler<Bindings>;
