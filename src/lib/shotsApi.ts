/**
 * Shot categories and shots, loaded once per page load and shared between
 * every ShotSelector and the match tracker.
 */

import { supabase } from './supabase';

export interface ShotCategory {
  id: string;
  name: string;
  display_order: number;
}

export interface Shot {
  id: string;
  category_id: string;
  name: string;
  display_name: string;
  display_order: number;
  description?: string;
}

export type ShotData = {
  categories: ShotCategory[];
  shots: Shot[];
};

let shotDataPromise: Promise<ShotData> | null = null;

const fetchShotData = async (): Promise<ShotData> => {
  const [categoriesResult, shotsResult] = await Promise.all([
    supabase.from('shot_categories').select('*').order('display_order', { ascending: true }),
    supabase.from('shots').select('*').order('display_order', { ascending: true }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (shotsResult.error) throw shotsResult.error;

  return {
    categories: categoriesResult.data ?? [],
    shots: shotsResult.data ?? [],
  };
};

/**
 * Load shot data, reusing the in-flight or completed request. A failed request
 * isn't cached, so the next call retries.
 */
export const loadShotData = (): Promise<ShotData> => {
  if (!shotDataPromise) {
    shotDataPromise = fetchShotData().catch(error => {
      shotDataPromise = null;
      throw error;
    });
  }
  return shotDataPromise;
};

/** Drop the cached shot data, e.g. after an admin edits shots. */
export const invalidateShotData = () => {
  shotDataPromise = null;
};

/** Shot names with special handling in the tracker. */
export const SERVICE_FAULT_SHOT = 'service_fault';
export const NO_SHOT = 'no_shot';
