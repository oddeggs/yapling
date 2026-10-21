# Yapling Plus

The paywall and the App Store through RevenueCat (StoreKit 2). The phone never tells the server it
bought anything: RevenueCat's webhook does (`apps/api/src/purchases`), and the server's ledger is
what counts. The RevenueCat app user id is the Yapling user id (`identifyPurchaser(userId)` after
every sign-in).

## For the founder: set up the store

App Store Connect, for each app (`studio.oddeggs.yapling` and `studio.oddeggs.yapling.dev`):

| | Yapling | Yapling Dev |
|---|---|---|
| Subscription group | Yapling Plus | Yapling Plus |
| Monthly, auto-renewing, 1 month | `yapling_plus_monthly` (₫149,000) | `yapling_plus_monthly.dev` |
| Yearly, auto-renewing, 1 year | `yapling_plus_yearly` (₫799,000) | `yapling_plus_yearly.dev` |
| Yearly introductory offer | Pay up front, 1 year, ₫599,000, new subscribers | same |

No free trial: the first week is the trial. If one is ever added, the button shows its real length
("Try 7 days free") by itself.

RevenueCat:

1. A project "Yapling" with an App Store app for each bundle id (upload the App Store Connect
   in-app purchase key so StoreKit 2 transactions validate).
2. Entitlement `plus`, with all four products attached.
3. An offering `default` (current) with two packages: `$rc_annual` → the yearly product and
   `$rc_monthly` → the monthly product (per app). The paywall finds products by id, so package
   names don't matter beyond that.
4. Webhook: URL `https://<api host>/api/purchases/webhook`, Authorization header value = a long
   random string. Put the same string in the Worker secret `REVENUECAT_WEBHOOK_AUTH`
   (`wrangler secret put REVENUECAT_WEBHOOK_AUTH --env dev|prd`) and in `apps/api/.dev.vars` for
   local work. Send events for both sandbox and production.
5. The public iOS SDK key of each app goes in the build environment as
   `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (EAS environment variables per profile; `.env.local` for local
   builds). Without it the paywall shows the design's prices marked dev-only, and nothing can be
   bought.

Links the paywall opens (placeholders until yapling.app is live, `links.ts`): terms
`https://yapling.app/terms`, privacy `https://yapling.app/privacy`, student pricing via support
`https://yapling.app/support`. They must exist before App Review.

## What the server does with an event

Purchases, renewals, plan changes and un-cancels turn Plus on for the reported period (150 live
minutes a month, fair use, counted from the period start). A cancellation keeps Plus to the end of
the period; a refund or an expiry turns it off. Events apply once by id and never out of order.
