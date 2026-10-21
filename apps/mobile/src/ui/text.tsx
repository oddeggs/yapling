import {
  colours,
  fontFor,
  inkOverflowTop,
  type TypeStyle,
  type TypeStyleKey,
} from '@yapling/theme';
import type { ReactNode } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import type { TextStyleProp } from './style';

export interface TxtProps extends Omit<TextProps, 'style'> {
  /** The theme type style (`bubble`, `button`, `gloss`…), or one of `typeExtras`. */
  readonly variant: TypeStyleKey | TypeStyle;
  readonly colour?: string | undefined;
  readonly align?: TextStyle['textAlign'];
  readonly style?: TextStyleProp;
  readonly children?: ReactNode;
}

/**
 * Text in one of the theme's type styles. Tight line heights leave stacked Vietnamese marks (`Ồ`,
 * `Ế`) above the line box, where iOS would cut them: the text gets that much room above and is
 * shifted back up, so it sits where the design puts it.
 */
export function Txt({ variant, colour = colours.text, align, style, children, ...rest }: TxtProps) {
  const over = inkOverflowTop(variant);
  return (
    <Text
      {...rest}
      style={[
        fontFor(variant),
        { color: colour },
        align ? { textAlign: align } : null,
        over > 0 ? { paddingTop: over, marginTop: -over } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
