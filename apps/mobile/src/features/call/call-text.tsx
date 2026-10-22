import { Txt, type TxtProps } from '../../ui/text';

/**
 * How far the call's text grows with Dynamic Type. The call is one fixed frame over its scene (the
 * cast, the bubble, the cards and the bar each have their place), so text grows with the
 * learner's setting up to this and no further, where the frame still holds.
 */
export const CALL_TEXT_MAX_SCALE = 1.3;

/** The call's text: the kit's `Txt`, growing with Dynamic Type up to the call's cap. */
export function CallTxt(props: TxtProps) {
  return <Txt maxFontSizeMultiplier={CALL_TEXT_MAX_SCALE} {...props} />;
}
