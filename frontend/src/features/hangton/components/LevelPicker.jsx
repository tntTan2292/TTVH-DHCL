import React from 'react';
import {
  COLUMN_PRESETS,
  TON_LEVELS,
  activePresetId,
  presetHiddenLevels,
  toggleHiddenLevel,
  shortLevelLabel,
} from '../hangtonLevels.js';

// Choose which Loại Tồn levels a block shows: presets (all / from 3 days / from 5 days) and one switch per level.
// Not part of the captured picture (data-no-capture).
export default function LevelPicker({ hiddenLevels = [], onChange, label = 'Mức tồn:', note = null }) {
  const presetId = activePresetId(hiddenLevels);
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-no-capture="true">
      <span className="whitespace-nowrap text-sm font-bold text-slate-700">{label}</span>
      {COLUMN_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(presetHiddenLevels(preset.id))}
          aria-pressed={presetId === preset.id}
          className={`cursor-pointer whitespace-nowrap rounded-md border px-2.5 py-0.5 text-sm font-semibold transition-colors ${
            presetId === preset.id ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {preset.label}
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-slate-300" />
      {TON_LEVELS.map((lvl) => {
        const shown = !hiddenLevels.includes(lvl);
        return (
          <button
            key={lvl}
            type="button"
            onClick={() => onChange(toggleHiddenLevel(hiddenLevels, lvl))}
            aria-pressed={shown}
            title={shown ? `Bấm để ẩn mức ${lvl}` : `Bấm để hiện lại mức ${lvl}`}
            className={`cursor-pointer whitespace-nowrap rounded border px-2 py-0.5 text-sm transition-colors ${
              shown ? 'border-red-300 bg-red-50 font-semibold text-red-800' : 'border-slate-200 bg-slate-100 text-slate-400 line-through'
            }`}
          >
            {shortLevelLabel(lvl)}
          </button>
        );
      })}
      {hiddenLevels.length > 0 && note ? <span className="text-sm text-slate-500">{note}</span> : null}
    </div>
  );
}
