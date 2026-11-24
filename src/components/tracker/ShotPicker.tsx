import { useEffect, useState } from 'react';
import { loadShotData, NO_SHOT, SERVICE_FAULT_SHOT, Shot, ShotCategory } from '../../lib/shotsApi';
import { shotLabel } from '../../lib/analysis';
import type { ShotInfo } from '../../types/database.types';

type Hand = ShotInfo['hand'];

type ShotPickerProps = {
  id: string;
  title: string;
  selected: ShotInfo | null;
  onSelect: (shot: ShotInfo) => void;
  // Whether the player this picker is for served the point. Decides whether
  // Serve or Service fault can be picked.
  sideServed: boolean;
  disabled?: boolean;
};

const categoryLabel = (name: string) => {
  const words = name.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// The last category used by each picker (winning and losing), kept between
// points so a run of similar rallies doesn't need the tab picking again
const lastCategoryIds: { [pickerId: string]: string } = {};

const ShotPicker = ({ id, title, selected, onSelect, sideServed, disabled = false }: ShotPickerProps) => {
  const [categories, setCategories] = useState<ShotCategory[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(lastCategoryIds[id] ?? null);

  useEffect(() => {
    let cancelled = false;
    loadShotData()
      .then(data => {
        if (cancelled) return;
        setCategories([...data.categories].sort((a, b) => a.display_order - b.display_order));
        // no_shot is recorded automatically on a service fault, never picked
        setShots(data.shots.filter(s => s.name !== NO_SHOT));
      })
      .catch(() => {
        if (!cancelled) setError('The shot list did not load. Refresh the page to try again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="notice error" role="alert">{error}</div>;
  if (categories.length === 0) return <div className="shot-picker-loading" role="status">Loading shots...</div>;

  // Until a tab is picked, open on the selected shot's category so the pick is visible
  const selectedCategoryId = shots.find(s => s.id === selected?.shotId)?.category_id;
  const active = categories.find(c => c.id === (activeId ?? selectedCategoryId)) ?? categories[0];
  const categoryShots = shots
    .filter(s => s.category_id === active.id)
    .sort((a, b) => a.display_order - b.display_order);

  const pickCategory = (categoryId: string) => {
    setActiveId(categoryId);
    lastCategoryIds[id] = categoryId;
  };

  const isUnavailable = (shot: Shot) =>
    (shot.name === 'serve' && !sideServed) || (shot.name === SERVICE_FAULT_SHOT && sideServed);

  const label = (shot: Shot) =>
    shotLabel({ ...shot, category: active.name, category_order: active.display_order });

  return (
    <div className={`shot-picker${disabled ? ' is-disabled' : ''}`} aria-labelledby={`${id}-title`} role="group">
      <div className="shot-tabs" role="tablist" aria-label={`${title}: category`}>
        {categories.map(c => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === active.id}
            onClick={() => pickCategory(c.id)}
            disabled={disabled}
          >
            {categoryLabel(c.name)}
          </button>
        ))}
      </div>
      <ul className="shot-rows">
        {categoryShots.length === 0 && <li className="faint shot-row-empty">No shots in this category.</li>}
        {categoryShots.map(shot => {
          const unavailable = isUnavailable(shot);
          const selectedHand: Hand | null = selected?.shotId === shot.id ? selected.hand : null;
          return (
            <li key={shot.id} className={`shot-row${selectedHand ? ' is-selected' : ''}${unavailable ? ' is-unavailable' : ''}`}>
              <span className="shot-row-label">{label(shot)}</span>
              {(['fh', 'bh'] as const).map(hand => (
                <button
                  key={hand}
                  type="button"
                  className="shot-hand"
                  aria-pressed={selectedHand === hand}
                  aria-label={`${label(shot)}, ${hand === 'fh' ? 'forehand' : 'backhand'}`}
                  disabled={disabled || unavailable}
                  onClick={() => onSelect({ shotId: shot.id, hand })}
                >
                  {hand.toUpperCase()}
                </button>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ShotPicker;
