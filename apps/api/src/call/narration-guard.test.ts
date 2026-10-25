import { describe, expect, it } from 'vitest';

import { ReplySplitter } from './reply-splitter';

/** Streams `text` through the splitter (and its guard) in pieces of `size` characters. */
function speak(text: string, speaker: string, size = 3, learner?: string) {
  const splitter = new ReplySplitter({
    maxWords: 25,
    speaker,
    ...(learner ? { learner } : {}),
  });
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    const words = splitter.push(text.slice(i, i + size));
    if (words) pieces.push(words);
  }
  const end = splitter.end();
  if (end.tail) pieces.push(end.tail);
  return { spoken: pieces.join('').trim(), action: splitter.guardAction, pieces };
}

describe('the narration guard', () => {
  it('keeps the leaked notes about the learner from the voice', () => {
    for (const size of [1, 3, 7, 40]) {
      const nudge = speak(
        'The learner has been silent, so I need to respond gently. Pip says something short, like "Take your time."',
        'Pip',
        size,
      );
      expect(nudge.spoken).toBe('Take your time.');
      expect(nudge.action).toBe('extracted');
    }
  });

  it('drops a sentence about the learner by name, and keeps them called by name', () => {
    const run = (text: string) => speak(text, 'Mei', 4, 'Ana').spoken;
    expect(run("Ana's last message was cut off. Ha, finding it late still counts!")).not.toMatch(
      /Ana's|cut off/,
    );
    expect(run('Ana has covered the goal, so I move on. Fifty years, same life? Brave.')).toMatch(
      /^Fifty years/,
    );
    expect(run('Ana, look at this sign! Can you hold it?')).toMatch(/^Ana, look/);
    expect(run('Ana! You came back.')).toMatch(/^Ana! You came back/);
  });

  it('drops the speaker described in the third person', () => {
    const box = speak('Ooh, this box says WORK! Pip opens it.', 'Pip');
    expect(box.spoken).toBe('Ooh, this box says WORK!');
    expect(box.action).toBe('dropped');
  });

  it('speaks the quoted line inside narration', () => {
    const unpack = speak('Pip sets down the box. "Hmm, we unpack, and we talk about work!', 'Pip');
    expect(unpack.spoken).toBe('Hmm, we unpack, and we talk about work!');
    expect(speak('Mei says: Aiyah, nothing lah.', 'Mei').spoken).toBe('Aiyah, nothing lah.');
  });

  it("never speaks the learner's words quoted in a note about them", () => {
    const note = speak(
      'The learner said "Mm, I\'m not sure either," so this is the unclear case. Is it money?',
      'Pip',
    );
    expect(note.spoken).toBe('Is it money?');
    expect(note.action).toBe('dropped');
  });

  it('drops asides, stage directions, labels and quotation marks', () => {
    expect(speak('Mei: Hmm, you still there?', 'Mei').spoken).toBe('Hmm, you still there?');
    expect(speak('*smiles warmly* Hello again!', 'Pip').spoken).toBe('Hello again!');
    expect(speak('(gently) What do you do for work?', 'Pip').spoken).toBe(
      'What do you do for work?',
    );
    expect(speak('"Take your time."', 'Pip').spoken).toBe('Take your time.');
    expect(speak('That is *really* good!', 'Pip').spoken).toBe('That is really good!');
    expect(speak('Let me respond kindly. No rush!', 'Pip').spoken).toBe('No rush!');
    expect(
      speak('Since the learner is quiet, I will ask again. What is your job?', 'Pip').spoken,
    ).toBe('What is your job?');
  });

  it('never reads out a direction it was given as if it were the line', () => {
    for (const size of [1, 3, 7, 80]) {
      const fallback = speak(
        "Say that's okay, no rush, you can tell me later. Then open the next box.",
        'Pip',
        size,
      );
      expect(fallback.spoken).toBe('');
      expect(fallback.action).toBe('dropped');
    }
    const lines: [string, string][] = [
      ['Say something kind about the job. Ooh, a teacher!', 'Ooh, a teacher!'],
      ['No problem! Then ask Mei about the date.', 'No problem!'],
      ['React warmly. That sounds fun!', 'That sounds fun!'],
      ['Tell them that it is fine. You can tell me later!', 'You can tell me later!'],
      ['Say kindly that it is okay. Okay! Next box!', 'Okay! Next box!'],
    ];
    for (const [line, spoken] of lines) expect(speak(line, 'Pip').spoken).toBe(spoken);
  });

  it('still speaks lines that only start like a direction', () => {
    for (const line of [
      'Say that again? I missed it.',
      'Tell me more!',
      'Say hello to Mei for me!',
      'Then we can rest!',
      'Then?',
    ]) {
      const out = speak(line, 'Pip');
      expect(out.spoken).toBe(line);
      expect(out.action).toBeNull();
    }
  });

  it('passes ordinary lines unchanged, word by word as they stream', () => {
    const lines: [string, string][] = [
      ['Aiyah, nothing lah, don’t worry about me.', 'Mei'],
      ['I think you should go to the meeting on Friday!', 'Pip'],
      ['The rent is double! I can’t pay that.', 'Mei'],
      ['Let me check my notebook first. Rent is money!', 'Pip'],
      ['I need a plan by Friday.', 'Mei'],
      ['I need to pay the rent by Friday.', 'Mei'],
      ['Pip and I can help you.', 'Pip'],
      ['Pip! Come and look at this box.', 'Pip'],
      ['So, what do you do for work?', 'Pip'],
      ['Since Friday, I can’t sleep.', 'Mei'],
      ['As you like! What about the café?', 'Mei'],
      ["Harbour Property Office, good morning. Who's calling, please?", 'Office'],
      ['She looks sad. Can you ask her what’s wrong?', 'Pip'],
      ['Mei looks worried. Ask her, okay?', 'Pip'],
      ['I will help you. I should call them, right?', 'Mei'],
      ["I'll pick up the phone!", 'Pip'],
    ];
    for (const [line, speaker] of lines) {
      const out = speak(line, speaker);
      expect(out.spoken).toBe(line);
      expect(out.action).toBeNull();
    }
  });

  it('adds no wait to a line that starts like speech', () => {
    const splitter = new ReplySplitter({ maxWords: 25, speaker: 'Pip' });
    expect(splitter.push('Ooh, th')).toBe('Ooh, ');
    expect(splitter.push('is box')).toBe('this ');
  });

  it('holds a suspicious start only until it reads as speech', () => {
    const splitter = new ReplySplitter({ maxWords: 25, speaker: 'Mei' });
    expect(splitter.push('I ')).toBe('');
    expect(splitter.push('think ')).toBe('I think ');
    expect(splitter.push('you ')).toBe('you ');
  });
});

describe('lines about the call itself', () => {
  it('keeps a line about writing the line from the voice', () => {
    for (const size of [1, 3, 7, 120]) {
      const out = speak(
        "Since you're asking me to write the line now: I'll wait for you to speak first…",
        'Pip',
        size,
      );
      expect(out.spoken).toBe('');
      expect(out.action).toBe('dropped');
    }
  });

  it('drops the call talked about and speaks the line after it', () => {
    const lines: [string, string, string][] = [
      [
        "I'll write my next line now. Hi! Is this your first day?",
        'Pip',
        'Hi! Is this your first day?',
      ],
      ['Let me write the line first. What do you do for work?', 'Pip', 'What do you do for work?'],
      ['You want me to write the dialogue, okay. So, a no!', 'Dex', 'So, a no!'],
      ["You're asking me to continue the roleplay. Hello again!", 'Mei', 'Hello again!'],
      ['Because the prompt says to wait, I will wait. Ready?', 'Pip', 'Ready?'],
      ['As I was writing the line, I paused. Okay! Your turn.', 'Pip', 'Okay! Your turn.'],
      [
        'Since it seems that right now the learner is quiet, I will ask again. Coffee?',
        'Mei',
        'Coffee?',
      ],
      ['The prompt asks for one question. What is your job?', 'Dex', 'What is your job?'],
    ];
    for (const [line, speaker, spoken] of lines) {
      const out = speak(line, speaker);
      expect(out.spoken).toBe(spoken);
      expect(out.action).toBe('dropped');
    }
  });

  it('still speaks lines that only look like it', () => {
    for (const [line, speaker] of [
      ['Hold the line, please. Who is calling?', 'Office'],
      ['Since you asked, I love writing!', 'Pip'],
      ["Since you're asking, the line at the café is long!", 'Mei'],
      ['Let me write that down!', 'Pip'],
      ["I'll write your name on the cup, okay?", 'Mei'],
      ['I need to write a line to Mei. Can you help?', 'Pip'],
      ['You want me to play your manager? Okay!', 'Dex'],
      ['You asked me to wait, so I waited!', 'Pip'],
      ['You did it! That was your first no.', 'Dex'],
      ["You're right, the café needs a sign.", 'Mei'],
      ['Because you wrote me a letter, I am happy!', 'Pip'],
      ['As you say, the next line is the hard one!', 'Hank'],
      ['So, what do you do for work?', 'Pip'],
      ['Because of the rent, we need a plan.', 'Mei'],
      ["I'm an AI, so I can't drink coffee. But you can!", 'Pip'],
    ] as const) {
      const out = speak(line, speaker);
      expect(out.spoken).toBe(line);
      expect(out.action).toBeNull();
    }
  });

  it('holds a clause only to its comma', () => {
    const splitter = new ReplySplitter({ maxWords: 25, speaker: 'Mei' });
    expect(splitter.push('Since ')).toBe('');
    expect(splitter.push('Friday, ')).toBe('Since Friday, ');
    expect(splitter.push('I ')).toBe('I ');
  });
});

describe('the case tag', () => {
  it('is kept for the call and never spoken', () => {
    const splitter = new ReplySplitter({ maxWords: 25, speaker: 'Pip' });
    const spoken = splitter.push('[question] I’m Pip! What do you do ') + splitter.end().tail;
    expect(spoken.trim()).toBe('I’m Pip! What do you do');
    expect(splitter.caseTag).toBe('question');
    expect(splitter.guardAction).toBeNull();
    const glued = new ReplySplitter({ maxWords: 25, speaker: 'Pip' });
    glued.push('[unclear]Sorry, ');
    expect(glued.end().tail + glued.text).toContain('Sorry,');
    expect(glued.caseTag).toBe('unclear');
  });
});
