import { STAGE_HTML } from '@yapling/scene/stage';
import type React from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  WebView as RNWebView,
  type WebViewMessageEvent,
  type WebViewProps,
} from 'react-native-webview';

// The web view's class typings don't line up with React 19's; its props are what matter here.
const WebView = RNWebView as unknown as React.ComponentType<
  WebViewProps & { ref?: React.Ref<RNWebView> }
>;

/*
 * The painted stage: the place, the critters, the captions and the painting's label, drawn by the
 * stage page (`@yapling/scene`'s paint code, the design's own) in a web view behind everything.
 * It takes no touches; the app tells it what is happening and it never decides anything.
 */

export type StageMessage =
  | {
      t: 'scene';
      place?: string;
      v?: number;
      wx?: string;
      hour?: number | null;
      offsetMs?: number;
      cut?: boolean;
    }
  | {
      t: 'talk';
      phase: 'idle' | 'speak' | 'listen' | 'think' | 'turn';
      who?: string | null;
      sleepAgain?: boolean;
    }
  | { t: 'line'; id: number; text: string; gloss?: string }
  | { t: 'chars'; n: number }
  | { t: 'lineDone' }
  | { t: 'gloss'; text: string }
  | { t: 'clearSay' }
  | { t: 'you'; text: string; final: boolean }
  | { t: 'clearYou' }
  | { t: 'label'; title: string; sub: string; ms?: number }
  | { t: 'hideLabel' }
  | { t: 'gesture'; who?: string; kind: string };

export interface PaintingSpec {
  readonly place: string;
  readonly v: number;
  readonly hour: number;
  readonly wx: string;
  readonly asleep?: boolean;
}

export interface StageHandle {
  send(message: StageMessage): void;
  /** A still painting of any place at any hour, as a data URL (JPEG). */
  render(spec: PaintingSpec, w: number, h: number): Promise<string>;
}

interface Props {
  /** The place's title changed (it follows the hour and the variant). */
  readonly onTitle?: (title: string, place: string) => void;
  readonly onReady?: () => void;
}

export const Stage = forwardRef<StageHandle, Props>(function Stage({ onTitle, onReady }, ref) {
  const web = useRef<RNWebView>(null);
  const ready = useRef(false);
  const queue = useRef<StageMessage[]>([]);
  const renders = useRef(new Map<string, (data: string) => void>());
  const seq = useRef(0);

  const post = (
    m:
      | StageMessage
      | { t: 'render'; id: string; spec: PaintingSpec; w: number; h: number; scale: number },
  ) => {
    web.current?.injectJavaScript(`window.stage&&window.stage.recv(${JSON.stringify(m)});true;`);
  };

  useImperativeHandle(ref, () => ({
    send(message) {
      if (!ready.current) {
        queue.current.push(message);
        return;
      }
      post(message);
    },
    render(spec, w, h) {
      return new Promise((resolve) => {
        seq.current += 1;
        const id = `r${seq.current}`;
        renders.current.set(id, resolve);
        const go = () => post({ t: 'render', id, spec, w, h, scale: 2 });
        if (ready.current) go();
        else setTimeout(go, 600);
      });
    },
  }));

  const onMessage = (e: WebViewMessageEvent) => {
    let m: {
      t?: string;
      id?: string;
      data?: string;
      title?: string;
      place?: string;
      message?: string;
    };
    try {
      m = JSON.parse(e.nativeEvent.data) as typeof m;
    } catch {
      return;
    }
    if (m.t === 'ready') {
      ready.current = true;
      for (const q of queue.current.splice(0)) post(q);
      onReady?.();
    } else if (m.t === 'rendered' && m.id) {
      renders.current.get(m.id)?.(m.data ?? '');
      renders.current.delete(m.id);
    } else if (m.t === 'title' && m.title) {
      onTitle?.(m.title, m.place ?? '');
    } else if (m.t === 'error' && __DEV__) {
      console.warn('stage error', m.message);
    }
  };

  const source = useMemo(() => ({ html: STAGE_HTML, baseUrl: 'https://stage.yapling.local/' }), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        ref={web}
        source={source}
        originWhitelist={['*']}
        onMessage={onMessage}
        style={styles.web}
        containerStyle={styles.web}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        allowsInlineMediaPlayback={false}
        mediaPlaybackRequiresUserAction
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // The stage page draws to the screen's edges; the safe areas come from env() inside it.
        injectedJavaScriptBeforeContentLoaded="document.documentElement.style.background='#09080b';true;"
        onContentProcessDidTerminate={() => {
          ready.current = false;
          web.current?.reload();
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: '#09080b' },
});
