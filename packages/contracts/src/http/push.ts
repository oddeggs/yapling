import { z } from 'zod';

/** `PUT` or `DELETE /api/me/push-token`: the Expo push token for voicemails and incoming calls. */
export const PushTokenRegistration = z.object({
  token: z
    .string()
    .max(512)
    .regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, 'An Expo push token'),
  platform: z.enum(['ios', 'android']),
});
export type PushTokenRegistration = z.infer<typeof PushTokenRegistration>;
