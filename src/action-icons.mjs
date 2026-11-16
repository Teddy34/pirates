// Pixel-art icons beside the dialog buttons: one 12×12 sprite per kind of
// action (talk to the governor, trade, put to sea...), picked from the
// button's label. Original art drawn for RetroPirates!.
// DOM-free: returns RGBA pixels; game.mjs turns them into images.

export const ACTION_ICON_SIZE = 12;

const PALETTE = {
  k: [33, 24, 15], // outline
  g: [232, 184, 74], // gold
  G: [168, 116, 46], // dark gold
  w: [243, 229, 197], // linen, paper, sail
  s: [184, 188, 196], // steel
  S: [93, 96, 104], // dark steel
  b: [122, 74, 36], // wood
  B: [74, 44, 20], // dark wood
  r: [176, 48, 42], // red
  u: [47, 93, 138], // sea blue
};

const ICONS = {
  crown: [
    '............', '............', '.k...kk...k.', '.kk.kggk.kk.', '.kgkkggkkgk.', '.kggggggggk.',
    '.kgrggggrgk.', '.kggggggggk.', '.kGGGGGGGGk.', '.kkkkkkkkkk.', '............', '............',
  ],
  mug: [
    '............', '..wwwwww....', '.wwwwwwww...', '.kkkkkkkk...', '.kgbbbbgkkk.', '.kgbbbbgk.k.',
    '.kgbbbbgk.k.', '.kgbbbbgkkk.', '.kgbbbbgk...', '.kGGGGGGk...', '.kkkkkkkk...', '............',
  ],
  coins: [
    '............', '...kkkkkk...', '..kggggggk..', '..kGGGGGGk..', '..kkkkkkkk..', '..kggggggk..',
    '..kGGGGGGk..', '..kkkkkkkk..', '..kggggggk..', '..kGGGGGGk..', '...kkkkkk...', '............',
  ],
  hammer: [
    '............', '..kkkkkkk...', '.ksssssssk..', '.kSSSSSSSk..', '..kkkbkkk...', '....kbk.....',
    '....kbk.....', '....kbk.....', '....kbk.....', '....kbk.....', '....kkk.....', '............',
  ],
  chest: [
    '............', '............', '..kkkkkkkk..', '.kbbbbbbbbk.', '.kBBBBBBBBk.', '.kkkkggkkkk.',
    '.kbbbkgkbbk.', '.kbbbbbbbbk.', '.kbbbbbbbbk.', '.kBBBBBBBBk.', '.kkkkkkkkkk.', '............',
  ],
  swords: [
    '............', '.S........S.', '.SS......SS.', '..SS....SS..', '...SS..SS...', '....SSSS....',
    '.....SS.....', '....SSSS....', '..gSS..SSg..', '..gg....gg..', '.kg......gk.', '............',
  ],
  book: [
    '............', '.kkkkkkkkk..', '.krrrrrrrrk.', '.krggggggrk.', '.krrrrrrrrk.', '.krrrrrrrrk.',
    '.krrggggrrk.', '.krrrrrrrrk.', '.krrrrrrrrk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............',
  ],
  quill: [
    '............', '.........uu.', '........uuu.', '.......uuk..', '......uuk...', '.....uuk....',
    '....uuk.....', '...uuk......', '...uk.......', '..kk........', '.kk.bbbbbb..', '............',
  ],
  anchor: [
    '............', '.....kk.....', '....kSSk....', '.....kk.....', '...kSSSSk...', '.....SS.....',
    '.....SS.....', '.k...SS...k.', '.Sk..SS..kS.', '..SS.SS.SS..', '...SSSSSS...', '............',
  ],
  ship: [
    '............', '.....k......', '.....kw.....', '....wkww....', '...wwkwww...', '..wwwkwwww..',
    '.....k......', '.bbbbbbbbbb.', '..bbbbbbbb..', '...BBBBBB...', '.uuuuuuuuuu.', '............',
  ],
  spyglass: [
    '............', '............', '.........kk.', '........kgk.', '.......kgk..', '......kgGk..',
    '.....kgGk...', '....kgGk....', '...kgGk.....', '..kbbk......', '..kbk.......', '............',
  ],
  map: [
    '............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwuwwwwrwk.', '.kwuuwwrwwk.', '.kwwuwrwrwk.',
    '.kwwwwwrwwk.', '.kwwgwwwwwk.', '.kwgggwwwwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............',
  ],
  mask: [
    '............', '............', '............', '.kkkkkkkkkk.', 'kBBBBBBBBBBk', 'kBkkBBBBkkBk',
    'kBkkBBBBkkBk', '.kBBBkkBBBk.', '..kkk..kkk..', '............', '............', '............',
  ],
  cannon: [
    '............', '............', '.kkkkkkkk...', 'kSSSSSSSSk..', 'kSssssssSkk.', 'kSSSSSSSSkk.',
    '.kkkbbkkk...', '...kbbbbk...', '..kbkkkkbk..', '..kbk..kbk..', '...k....k...', '............',
  ],
  heart: [
    '............', '............', '..kk...kk...', '.krrk.krrk..', '.krrrkrrrk..', '.krrrrrrrk..',
    '..krrrrrk...', '...krrrk....', '....krk.....', '.....k......', '............', '............',
  ],
  cross: [
    '............', '.kk......kk.', 'krrk....krrk', '.krrk..krrk.', '..krrkkrrk..', '...krrrrk...',
    '...krrrrk...', '..krrkkrrk..', '.krrk..krrk.', 'krrk....krrk', '.kk......kk.', '............',
  ],
  back: [
    '............', '............', '....k.......', '...kk.......', '..kgkkkkkk..', '.kggggggggk.',
    '..kgkkkkkk..', '...kk.......', '....k.......', '............', '............', '............',
  ],
  next: [
    '............', '............', '.......k....', '.......kk...', '..kkkkkkgk..', '.kggggggggk.',
    '..kkkkkkgk..', '.......kk...', '.......k....', '............', '............', '............',
  ],
  // The sailing controls under the map (game.mjs, setControl).
  'turn-port': [
    '............', '....kkkkkk..', '...kggggggk.', '...kgkkkkgk.', '.kkkgkkkkgk.', '.kgggggkkgk.',
    '..kgggk.kgk.', '...kgk..kgk.', '....k...kgk.', '........kgk.', '........kkk.', '............',
  ],
  'sails-up': [
    '....k.....k.', 'bbbbbbbbbkkk', 'kwwwwwwwk.k.', 'kwwwwwwwk.k.', 'kwwwwwwwk.k.', '.kwwwwwk..k.',
    '..kkkkk.....', '....k.......', '....k.......', '.kbbbbbbbbk.', '..kBBBBBBk..', '.uuuuuuuuuu.',
  ],
  'sails-down': [
    '....k.......', 'bbbbbbbbb.k.', 'kwwwwwwwk.k.', 'kwwwwwwwk.k.', 'kwwwwwwwk.k.', '.kwwwwwk.kkk',
    '..kkkkk...k.', '....k.......', '....k.......', '.kbbbbbbbbk.', '..kBBBBBBk..', '.uuuuuuuuuu.',
  ],
  pause: [
    '............', '............', '..kkk..kkk..', '..kgk..kgk..', '..kgk..kgk..', '..kgk..kgk..',
    '..kgk..kgk..', '..kgk..kgk..', '..kGk..kGk..', '..kkk..kkk..', '............', '............',
  ],
  play: [
    '............', '...kk.......', '...kgk......', '...kggk.....', '...kgggk....', '...kggggk...',
    '...kggggk...', '...kgggk....', '...kggk.....', '...kgk......', '...kk.......', '............',
  ],
  'zoom-in': [
    '..kkkkk.....', '.kwwwwwk....', 'kwwwkwwwk...', 'kwwwkwwwk...', 'kwkkkkkwk...', 'kwwwkwwwk...',
    'kwwwkwwwk...', '.kwwwwwkk...', '..kkkkkkbk..', '.......kbbk.', '........kbbk', '.........kk.',
  ],
  'zoom-out': [
    '..kkkkk.....', '.kwwwwwk....', 'kwwwwwwwk...', 'kwwwwwwwk...', 'kwkkkkkwk...', 'kwwwwwwwk...',
    'kwwwwwwwk...', '.kwwwwwkk...', '..kkkkkkbk..', '.......kbbk.', '........kbbk', '.........kk.',
  ],
  shovel: [
    '.........kk.', '........kbbk', '.......kbkk.', '......kbk...', '.....kbk....', '....kbk.....',
    '..kkSk......', '.ksssk......', 'kssssk......', 'ksssk.......', 'kkkk........', '............',
  ],
  'treasure-map': [
    '............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwwrrwwrrk.', '.kwwwrrrrwk.', '.kwwwwrrwwk.',
    '.kwwwrrrrwk.', '.kwGrrwwrrk.', '.kGwwwwwwwk.', '.kwGwwwwwwk.', '.kkkkkkkkkk.', '............',
  ],
  bolt: [
    '.....kkkk...', '....kggk....', '...kggk.....', '..kggkkkk...', '.kggggggk...', '.kkkkggk....',
    '....kggk....', '...kggk.....', '..kgk.......', '..kk........', '............', '............',
  ],
};

// Mirrored and turned copies: starboard mirrors port, and the up and down
// arrows turn the back arrow.
const mirror = (rows) => rows.map((row) => [...row].reverse().join(''));
const turnRight = (rows) => rows.map((_, y) => rows.map((row) => row[y]).reverse().join(''));
const turnLeft = (rows) => mirror(turnRight(rows)).reverse();
ICONS['turn-starboard'] = mirror(ICONS['turn-port']);
ICONS.up = turnRight(ICONS.back);
ICONS.down = turnLeft(ICONS.back);

// First match wins, so the specific actions come before the generic ones.
const LABEL_ICONS = [
  [/attack|prepare for battle|close for battle|plunder and sink/i, 'cannon'],
  [/^delete|^overwrite/i, 'cross'],
  [/^(return|back|close|decline|no\b|nothing|withdraw|part company|remain)/i, 'back'],
  [/^wait/i, 'next'],
  [/sword|duel|fencing|storm/i, 'swords'],
  [/governor|audience|mission/i, 'crown'],
  [/propose|conversation|marriage|retract/i, 'heart'],
  [/sneak/i, 'mask'],
  [/map|chart|dig/i, 'map'],
  [/logbook|log\b|personal status|city information/i, 'book'],
  [/save/i, 'quill'],
  [/shipwright|repair/i, 'hammer'],
  [/plunder|looting/i, 'chest'],
  [/merchant|gold|ransom|offer|^food$|^goods$|jettison/i, 'coins'],
  [/tavern|barmaid|bartender|sailors/i, 'mug'],
  [/investigate|hail|follow|traveller/i, 'spyglass'],
  [/sail into|march into|harbor/i, 'anchor'],
  [/put to sea|sail away|leave town|voyage|keep sailing|prize crew|keep her|pirating/i, 'ship'],
  [/^leave/i, 'back'],
  [/^(continue|next|yes|done|welcome|take|keep walking|wait|finish)/i, 'next'],
];

export function actionIconName(label) {
  return LABEL_ICONS.find(([pattern]) => pattern.test(label))?.[1] ?? null;
}

export const ACTION_ICON_NAMES = Object.keys(ICONS);

// The icon's RGBA pixels, ACTION_ICON_SIZE square.
export function paintActionIcon(name) {
  const rows = ICONS[name];
  if (!rows) throw new Error(`No action icon ${name}`);
  const pixels = new Uint8ClampedArray(ACTION_ICON_SIZE * ACTION_ICON_SIZE * 4);
  rows.forEach((row, y) => [...row].forEach((cell, x) => {
    const colour = PALETTE[cell];
    if (!colour) return;
    pixels.set([...colour, 255], (y * ACTION_ICON_SIZE + x) * 4);
  }));
  return { width: ACTION_ICON_SIZE, height: ACTION_ICON_SIZE, pixels };
}
