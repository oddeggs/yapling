/*
 * The API's routes, under `<host>/api`. Every route but the session ones takes
 * `Authorization: Bearer <session token>`. Errors answer `ApiError`.
 *
 *   POST   /api/session/guest        GuestSessionRequest → Session
 *   POST   /api/session/apple        AppleLinkRequest → Session (keeps the guest's progress)
 *   GET    /api/me/profile           → Profile
 *   PUT    /api/me/profile           ProfileInput → Profile (onboarding)
 *   PATCH  /api/me/profile           ProfileUpdate → Profile
 *   GET    /api/me/progress          → Progress
 *   PUT    /api/me/progress          ProgressPut → Progress (409 stale_revision when based on an old revision)
 *   GET    /api/me/memory            → MemoryList
 *   POST   /api/me/memory            MemoryCreate → MemoryItem
 *   PATCH  /api/me/memory/:id        MemoryUpdate → MemoryItem
 *   DELETE /api/me/memory/:id        → 204
 *   GET    /api/me/minutes           → MinutesSummary
 *   GET    /api/calls                → CallRecordList (most recent first)
 *   GET    /api/calls/:id            → CallRecord
 *   GET    /api/calls/socket         the call socket (see `call/common.ts`)
 *   PUT    /api/me/push-token        PushTokenRegistration → 204
 *   DELETE /api/me/push-token        PushTokenRegistration → 204
 *   POST   /api/me/delete            DeleteAccountRequest → DeleteAccountResponse
 */

export const API_ROUTES = {
  guestSession: '/api/session/guest',
  appleSession: '/api/session/apple',
  profile: '/api/me/profile',
  progress: '/api/me/progress',
  memory: '/api/me/memory',
  memoryItem: (id: string) => `/api/me/memory/${encodeURIComponent(id)}`,
  minutes: '/api/me/minutes',
  calls: '/api/calls',
  call: (id: string) => `/api/calls/${encodeURIComponent(id)}`,
  callSocket: '/api/calls/socket',
  pushToken: '/api/me/push-token',
  deleteAccount: '/api/me/delete',
} as const;
