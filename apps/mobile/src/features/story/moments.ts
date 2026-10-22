import type { Id } from '@yapling/contracts';

import type { SeenMoment } from '../../data';

/** The first week's moment each between-call scene stands for, as the burrow's plan names them. */
const MOMENT_OF_SCENE: Readonly<Record<Id, SeenMoment>> = {
  's1-e1-story': 'pip_story',
  's1-e1-postcard': 'linh_postcard',
  's1-e1-voicemail': 'voicemail',
};

/** The moments a set of finished scenes stand for (scenes with none are left out). */
export const momentsOfScenes = (ids: readonly Id[]): SeenMoment[] =>
  ids.flatMap((id) => {
    const moment = MOMENT_OF_SCENE[id];
    return moment === undefined ? [] : [moment];
  });
