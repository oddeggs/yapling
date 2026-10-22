import type { RecordedLineId } from '@yapling/story';
import { RECORDED_LINE_ASSETS } from '@yapling/story/assets';

import type { RecordedLineSource } from './player';

const isRecordedLineId = (id: string): id is RecordedLineId => id in RECORDED_LINE_ASSETS;

/** The story's recorded lines, bundled with the app. */
export const storyRecordedLines: RecordedLineSource = (lineId) => {
  if (!isRecordedLineId(lineId)) return null;
  const asset = RECORDED_LINE_ASSETS[lineId];
  return { audio: asset.audio(), timing: asset.timing() };
};
