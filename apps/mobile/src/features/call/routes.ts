/*
 * Where a call goes. The post-call card and the safety sheet are built elsewhere; the call only
 * knows their routes.
 */

/** A call: `/(call)/call?scene=s1-e1` (or `/(call)/s1-e1`, the same screen). */
export const CALL_ROUTE = '/(call)/call';

/** After a call: the summary and the seeds turning into sprouts. */
export const POST_CALL_ROUTE = '/(home)/post';

/** The crisis sheet with the country's numbers. */
export const SAFETY_ROUTE = '/(sheet)/safety';

/** The burrow, when a call ends with nothing to show (hung up before it started). */
export const BURROW_ROUTE = '/(home)';

export interface CallRouteParams {
  /** The scene to run (`s1-e1`, `s1-pro-unpack`, `s1-e1-practice`). */
  readonly scene: string;
  /** `hands` for hands-free turns; hold-to-talk otherwise. */
  readonly turn?: string;
}

export const callHref = (params: CallRouteParams) => ({
  pathname: CALL_ROUTE,
  params: { ...params },
});

export const postCallHref = (callId: string) => ({
  pathname: POST_CALL_ROUTE,
  params: { callId },
});
