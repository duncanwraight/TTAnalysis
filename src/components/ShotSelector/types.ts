export type ShotType = {
  id: string;
  label: string;
};

export type ShotCategory = {
  id: string;
  label: string;
  shots: ShotType[];
};

export const SHOT_CATEGORIES: ShotCategory[] = [
  {
    id: 'serve',
    label: 'Serve',
    shots: [
      { id: 'serve', label: 'Serve' },
      { id: 'serve_receive', label: 'Serve receive' }
    ]
  },
  {
    id: 'around_net',
    label: 'Around the net',
    shots: [
      { id: 'push', label: 'Push' },
      { id: 'flick', label: 'Flick' },
    ]
  },
  {
    id: 'pips',
    label: 'Pips',
    shots: [
      { id: 'bump', label: 'Bump' },
      { id: 'sideswipe', label: 'Sideswipe' },
      { id: 'attack', label: 'Attack' },
    ]
  },
  {
    id: 'attacks',
    label: 'Attacks',
    shots: [
      { id: 'flat_hit', label: 'Flat-hit' },
      { id: 'loop', label: 'Loop' },
      { id: 'smash', label: 'Smash' },
      { id: 'counter_loop', label: 'Counter-loop' },
    ]
  },
  {
    id: 'defence',
    label: 'Defence',
    shots: [
      { id: 'chop', label: 'Chop' },
      { id: 'fish', label: 'Fish' },
      { id: 'lob', label: 'Lob' },
    ]
  }
];