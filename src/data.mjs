export const WORLD = { width: 640, height: 480 };

export const NATIONS = {
  Spain: { color: '#e3bd43', dark: '#745a18' },
  England: { color: '#d95b53', dark: '#772a28' },
  France: { color: '#5c86cc', dark: '#29466f' },
  Holland: { color: '#db8745', dark: '#7b4623' },
  pirate: { color: '#d8d1bd', dark: '#3e3a33' },
};

export const SHIPS = {
  Pinnace: { type: 0, sizeClass: 0, capacity: 64, guns: 8, cargo: 20 },
  Sloop: { type: 1, sizeClass: 1, capacity: 96, guns: 12, cargo: 40 },
  Barque: { type: 2, sizeClass: 2, capacity: 128, guns: 16, cargo: 60 },
  'Cargo fluyt': { type: 3, sizeClass: 3, capacity: 160, guns: 20, cargo: 80 },
  Merchantman: { type: 4, sizeClass: 4, capacity: 192, guns: 24, cargo: 100 },
  Frigate: { type: 5, sizeClass: 5, capacity: 224, guns: 28, cargo: 120 },
  'War galleon': { type: 6, sizeClass: 6, capacity: 256, guns: 32, cargo: 140 },
  Galleon: { type: 7, sizeClass: 7, capacity: 288, guns: 36, cargo: 160 },
};

export const SPEED_TABLE_1560 = {
  Pinnace: [4, 5, 6, 7, 7, 6, 4, 3, 3, 3, 4, 6, 7, 7, 6, 5],
  Sloop: [5, 6, 7, 7, 6, 5, 4, 2, 2, 2, 4, 5, 6, 7, 7, 6],
  Barque: [4, 5, 5, 6, 5, 4, 3, 2, 1, 2, 3, 4, 5, 6, 5, 5],
  'Cargo fluyt': [5, 6, 5, 4, 3, 2, 1, 0, -1, 0, 1, 2, 3, 4, 5, 6],
  Merchantman: [4, 5, 6, 4, 3, 2, 1, 0, -1, 0, 1, 2, 3, 4, 6, 5],
  Frigate: [5, 6, 6, 5, 3, 2, 1, 0, -1, 0, 1, 2, 3, 5, 6, 6],
  'War galleon': [4, 5, 5, 4, 3, 2, 1, 0, -1, 0, 1, 2, 3, 4, 5, 5],
  Galleon: [4, 4, 5, 3, 3, 2, 1, 0, -1, 0, 1, 2, 3, 3, 5, 4],
};

const town = (name, x, y, nation, forts, soldiers, population, gold, growth, flags = 0, mood = 0) =>
  ({ name, x, y, nation, forts, soldiers, population, gold, growth, flags, mood, alert: 0 });

// 1560 scenario records from ../piratesgold/evidence/data/towns_by_era.json.
export const TOWNS_1560 = [
  town('Borburata', 520, 358, 'Spain', 1, 18, 21, 10, 100),
  town('Campeche', 125, 251, 'Spain', 1, 25, 30, 40, 150, 0x10),
  town('Cartagena', 373, 399, 'Spain', 4, 40, 45, 40, 180),
  town('Charlesfort', 247, 15, 'France', 1, 2, 2, 1, 12, 0x01),
  town('Coro', 477, 353, 'Spain', 0, 10, 13, 10, 90),
  town('Cumana', 564, 350, 'Spain', 1, 20, 16, 25, 150, 0x10),
  town('Eleuthera', 334, 128, 'England', 0, 1, 1, 0, 10, 0x21),
  town('Florida Keys', 262, 144, 'France', 0, 1, 2, 0, 15, 0x21),
  town('Fort Caroline', 251, 46, 'France', 1, 1, 1, 0, 10, 0x01),
  town('Gibraltar', 455, 407, 'Spain', 0, 5, 16, 0, 70, 0x01),
  town('Gran Granada', 198, 399, 'Spain', 0, 25, 18, 15, 90, 0x40),
  town('Grand Bahama', 294, 104, 'France', 0, 1, 2, 0, 10, 0x21),
  town('Havana', 245, 179, 'Spain', 3, 25, 20, 50, 130, 0x18),
  town('Isabella', 436, 202, 'Spain', 0, 5, 10, 0, 70, 0x01),
  town('Jalapa', 23, 265, 'Spain', 0, 1, 4, 2, 35, 0x40),
  town('Maracaibo', 442, 380, 'Spain', 1, 12, 12, 15, 130, 0x10),
  town('Margarita', 569, 334, 'Spain', 1, 13, 8, 25, 90),
  town('Nassau', 315, 133, 'England', 0, 1, 1, 0, 10, 0x21),
  town('Nombre de Dios', 320, 433, 'Spain', 1, 12, 13, 15, 110),
  town('Panama', 316, 441, 'Spain', 1, 25, 50, 50, 200, 0x10),
  town('Puerto Cabello', 503, 363, 'Spain', 1, 8, 10, 10, 80, 0x05),
  town('Puerto Principe', 325, 202, 'Spain', 1, 12, 25, 15, 130, 0x44),
  town('Rio de la Hacha', 419, 369, 'Spain', 1, 16, 22, 30, 150),
  town('San Juan', 506, 206, 'Spain', 3, 30, 33, 6, 170, 0x18),
  town('Santo Domingo', 444, 225, 'Spain', 4, 50, 40, 10, 180, 0x18),
  town('Santiago', 346, 218, 'Spain', 3, 45, 50, 90, 200, 0x18),
  town('Santiago Vega', 340, 266, 'Spain', 0, 2, 6, 0, 40, 0x05),
  town('Santa Marta', 394, 380, 'Spain', 1, 8, 18, 12, 90, 0x04),
  town('St. Augustine', 254, 53, 'France', 0, 15, 6, 0, 25, 0x21),
  town('Tampico', 13, 214, 'Spain', 1, 20, 12, 19, 120, 0x02),
  town('Trinidad', 608, 336, 'Spain', 0, 1, 5, 0, 40, 0x22),
  town('Vera Cruz', 37, 272, 'Spain', 2, 35, 30, 50, 170, 0x10),
  town('Villa Hermosa', 85, 284, 'Spain', 0, 20, 20, 20, 90, 0x40),
  town('Yaguana', 411, 228, 'Spain', 0, 3, 8, 0, 50, 0x01),
];

export const ENCOUNTERS_1560 = {
  Spain: [
    ['Barque', 'Spain', 9, 4, 3, 25], ['Merchantman', 'Spain', 13, 8, 4, 40],
    ['Galleon', 'Spain', 70, 20, 5, 65], ['Pinnace', 'pirate', 12, 4, 7, 15],
    ['War galleon', 'Spain', 80, 32, 8, 75],
  ],
  England: [
    ['Pinnace', 'England', 6, 2, 5, 5], ['Barque', 'England', 7, 4, 5, 10],
    ['Barque', 'pirate', 30, 10, 7, 30], ['Galleon', 'Spain', 50, 18, 5, 40],
    ['Frigate', 'England', 54, 24, 8, 40],
  ],
  France: [
    ['Pinnace', 'France', 7, 2, 5, 5], ['Pinnace', 'pirate', 16, 8, 7, 10],
    ['Barque', 'pirate', 40, 16, 7, 35], ['Galleon', 'Spain', 60, 20, 5, 55],
    ['Frigate', 'France', 56, 24, 8, 40],
  ],
  Holland: [
    ['Pinnace', 'Spain', 7, 2, 3, 10], ['Merchantman', 'Spain', 12, 8, 4, 35],
    ['Galleon', 'Spain', 65, 22, 6, 60], ['Merchantman', 'pirate', 45, 16, 7, 40],
    ['War galleon', 'Spain', 70, 28, 6, 60],
  ],
};

// Original vector geography, drawn in the game's 640×480 coordinate space.
export const LAND_SHAPES = [
  [[0, 0], [278, 0], [274, 32], [262, 63], [267, 94], [276, 120], [268, 153], [248, 159], [229, 146], [199, 135], [169, 137], [139, 154], [108, 171], [79, 184], [48, 190], [0, 185]],
  [[0, 188], [48, 193], [78, 211], [106, 233], [130, 258], [145, 291], [162, 323], [184, 355], [214, 384], [245, 407], [283, 425], [321, 434], [315, 480], [0, 480]],
  [[318, 433], [349, 414], [380, 394], [412, 376], [448, 363], [484, 352], [519, 344], [557, 336], [597, 327], [640, 312], [640, 480], [315, 480]],
  [[220, 171], [246, 164], [279, 171], [311, 187], [349, 206], [345, 220], [309, 216], [274, 202], [238, 194]],
  [[388, 194], [420, 188], [455, 195], [474, 211], [459, 230], [426, 234], [398, 220]],
  [[493, 198], [508, 195], [524, 202], [522, 215], [503, 218], [492, 209]],
  [[553, 323], [570, 317], [585, 326], [579, 341], [561, 342]],
  [[596, 327], [610, 322], [622, 335], [615, 348], [600, 344]],
  [[300, 98], [308, 91], [314, 101], [309, 111]],
  [[323, 116], [333, 110], [341, 123], [334, 134], [326, 128]],
];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function freshTowns() {
  return TOWNS_1560.map((entry) => ({ ...entry }));
}
