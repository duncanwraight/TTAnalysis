import { HANDS, HAND_LABEL, RUBBERS, RUBBER_LABEL, type Hand, type Kit, type PlayStyle, type Rubber } from '../lib/styles';

type Props = {
  // Prefix for the field ids, unique on the page
  id: string;
  kit: Kit;
  styles: PlayStyle[];
  onChange: (kit: Kit) => void;
  disabled?: boolean;
  // What an empty style reads as: "Not set" on a player, "Not known" on an opponent
  emptyLabel?: string;
};

/** Style of play, hand and the rubber on each wing. Every part can be left empty. */
const StyleFields = ({ id, kit, styles, onChange, disabled, emptyLabel = 'Not known' }: Props) => {
  const style = styles.find(s => s.id === kit.style_id);
  const rubberSelect = (side: 'forehand_rubber' | 'backhand_rubber', label: string) => (
    <label className="field" htmlFor={`${id}-${side}`}>
      <span>{label}</span>
      <select
        id={`${id}-${side}`}
        value={kit[side] ?? ''}
        onChange={e => onChange({ ...kit, [side]: (e.target.value || null) as Rubber | null })}
        disabled={disabled}
      >
        <option value="">Not known</option>
        {RUBBERS.map(r => <option key={r} value={r}>{RUBBER_LABEL[r]}</option>)}
      </select>
    </label>
  );

  return (
    <div className="style-fields">
      <label className="field" htmlFor={`${id}-style`}>
        <span>Style of play</span>
        <select
          id={`${id}-style`}
          value={kit.style_id ?? ''}
          onChange={e => onChange({ ...kit, style_id: e.target.value || null })}
          disabled={disabled}
          aria-describedby={style?.description ? `${id}-style-desc` : undefined}
        >
          <option value="">{emptyLabel}</option>
          {styles.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {style?.description && <span className="field-hint" id={`${id}-style-desc`}>{style.description}</span>}
      </label>
      <div className="field">
        <span id={`${id}-hand`}>Hand</span>
        <div className="segmented compact" role="group" aria-labelledby={`${id}-hand`}>
          {[...HANDS, null].map((hand: Hand | null) => (
            <button
              key={hand ?? 'unknown'}
              type="button"
              aria-pressed={kit.hand === hand}
              onClick={() => onChange({ ...kit, hand })}
              disabled={disabled}
            >
              {hand ? HAND_LABEL[hand].replace('-handed', '') : 'Not known'}
            </button>
          ))}
        </div>
      </div>
      <div className="style-fields-rubbers">
        {rubberSelect('forehand_rubber', 'Forehand rubber')}
        {rubberSelect('backhand_rubber', 'Backhand rubber')}
      </div>
    </div>
  );
};

export default StyleFields;
