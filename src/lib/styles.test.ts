import { describe, expect, it } from 'vitest';
import { buildStyleSection, describeHandAndRubbers, describeRubbers, hasKit, kitColumns, opponentKit, playerKit, type StyleData } from './styles';

const DATA: StyleData = {
  styles: [
    { id: 'hitter', name: 'Close-to-table hitter', description: 'Stays at the table', as_notes: 'Take the ball early.', against_notes: 'Move them back.', display_order: 1 },
    { id: 'chopper', name: 'Chopper', description: 'Defends from distance', as_notes: 'Keep it low.', against_notes: 'Be patient.', display_order: 2 },
    { id: 'blank', name: 'All-rounder', description: '', as_notes: '', against_notes: '', display_order: 3 },
  ],
  kitNotes: [
    { key: 'left_handed', against_notes: 'Serve to their wide forehand.' },
    { key: 'long_pips', against_notes: 'Your spin comes back the other way.' },
    { key: 'short_pips', against_notes: '' },
  ],
  matchups: [{ id: 'm1', player_style_id: 'hitter', opponent_style_id: 'chopper', notes: 'Hit the high ball only.' }],
};

describe('describing a kit', () => {
  it('names each wing, or both sides when they match', () => {
    expect(describeRubbers({ forehand_rubber: 'inverted', backhand_rubber: 'long_pips' })).toBe('inverted forehand, long pips backhand');
    expect(describeRubbers({ forehand_rubber: 'inverted', backhand_rubber: 'inverted' })).toBe('inverted both sides');
    expect(describeRubbers({ forehand_rubber: null, backhand_rubber: 'anti' })).toBe('anti backhand');
    expect(describeHandAndRubbers({ style_id: null, hand: 'left', forehand_rubber: null, backhand_rubber: 'short_pips' }))
      .toBe('Left-handed · short pips backhand');
    expect(describeHandAndRubbers({ style_id: 'x', hand: null, forehand_rubber: null, backhand_rubber: null })).toBe('');
  });

  it('moves between match columns and kits', () => {
    const kit = { style_id: 'chopper', hand: 'right' as const, forehand_rubber: 'inverted' as const, backhand_rubber: 'long_pips' as const };
    const columns = kitColumns('opponent', kit);
    expect(opponentKit(columns)).toEqual(kit);
    expect(hasKit(playerKit(columns))).toBe(false);
  });
});

describe('buildStyleSection', () => {
  it('is empty when there are no styles or notes, so old inputs stay the same', () => {
    expect(buildStyleSection({}, DATA, null)).toEqual([]);
    expect(buildStyleSection({}, DATA, '   ')).toEqual([]);
  });

  it('gives both styles with their notes, the opponent\'s kit notes and the match-up', () => {
    const lines = buildStyleSection({
      player_style_id: 'hitter', player_hand: 'left', player_backhand_rubber: 'short_pips',
      opponent_style_id: 'chopper', opponent_hand: 'left', opponent_forehand_rubber: 'inverted', opponent_backhand_rubber: 'long_pips',
    }, DATA, 'Struggling with the backhand loop.');
    expect(lines[0]).toBe('');
    expect(lines[1]).toMatch(/^Styles and the player's notes\./);
    expect(lines.slice(2)).toEqual([
      'Player\'s style: Close-to-table hitter (Stays at the table). Left-handed, short pips backhand. Playing as this style: Take the ball early.',
      'Opponent\'s style: Chopper (Defends from distance). Left-handed, inverted forehand, long pips backhand. Playing against this style: Be patient.',
      'Against a left-hander: Serve to their wide forehand.',
      'Against long pips (the opponent\'s backhand): Your spin comes back the other way.',
      'Match-up, close-to-table hitter against chopper: Hit the high ball only.',
      'Notes on the player, written by whoever entered the match: Struggling with the backhand loop.',
    ]);
  });

  it('leaves out notes that are empty and match-ups the other way round', () => {
    const lines = buildStyleSection({
      player_style_id: 'chopper', opponent_style_id: 'blank', opponent_forehand_rubber: 'short_pips', opponent_backhand_rubber: 'short_pips',
    }, DATA, null);
    expect(lines.slice(2)).toEqual([
      'Player\'s style: Chopper (Defends from distance). Playing as this style: Keep it low.',
      'Opponent\'s style: All-rounder. Short pips both sides.',
    ]);
  });

  it('describes a side with a hand or rubber but no style', () => {
    const lines = buildStyleSection({ opponent_hand: 'left' }, { ...DATA, kitNotes: [] }, null);
    expect(lines.slice(2)).toEqual(['Opponent\'s style: not given. Left-handed.']);
  });

  it('names both wings when the opponent has the same pips on each', () => {
    const lines = buildStyleSection({ opponent_forehand_rubber: 'long_pips', opponent_backhand_rubber: 'long_pips' }, DATA, null);
    expect(lines).toContain('Against long pips (the opponent\'s forehand and backhand): Your spin comes back the other way.');
  });
});
