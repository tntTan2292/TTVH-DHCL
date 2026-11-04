// Executive summary line of the Home page (PO 2026-11-04, option A: rank and trend).
// It only counts what the cards already show - how the national rank moved against the previous period - so it
// invents no total score and does not depend on the target (every indicator may be below it for weeks).
// A card without a previous rank is left out of the count, never counted as "giữ hạng".

import { previousBasisLabel } from './homePeriod.js';

const hasMovement = (card) => card?.available !== false && card?.rank_movement !== null && card?.rank_movement !== undefined
  && Number.isFinite(Number(card.rank_movement));

/**
 * @param {Array} indicators cards of GET /api/home/executive ({ id, label, available, rank_movement })
 * @param {string} period 'day' | 'week' | 'month'
 * @returns {null | { basis, up, same, down, counted, total, worst }}
 *   worst = the indicator that lost the most places ({ id, label, places }) or null when none lost any.
 */
export function buildRankSummary(indicators, period = 'day') {
  const cards = Array.isArray(indicators) ? indicators : [];
  if (!cards.length) return null;
  const counted = cards.filter(hasMovement);
  let up = 0;
  let same = 0;
  let down = 0;
  let worst = null;
  for (const card of counted) {
    const movement = Number(card.rank_movement);
    if (movement > 0) up += 1;
    else if (movement < 0) {
      down += 1;
      if (!worst || movement < -worst.places) worst = { id: card.id, label: card.label, places: -movement };
    } else same += 1;
  }
  return { basis: previousBasisLabel(period), up, same, down, counted: counted.length, total: cards.length, worst };
}
