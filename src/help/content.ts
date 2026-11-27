import type { MDXContent } from 'mdx/types';

/**
 * Loads each help page's MDX on demand. main.tsx loads the page being opened
 * before React first renders, so the prerendered HTML stays on screen until
 * the same words are ready to replace it.
 */
const loaders = import.meta.glob<{ default: MDXContent }>('./content/*.mdx');
const loaded: Record<string, MDXContent> = {};

export const loadedHelpContent = (slug: string): MDXContent | undefined => loaded[slug];

export const loadHelpContent = async (slug: string): Promise<MDXContent> => {
  if (loaded[slug]) return loaded[slug];
  const load = loaders[`./content/${slug}.mdx`];
  if (!load) throw new Error(`No help page called ${slug}`);
  const mod = await load();
  loaded[slug] = mod.default;
  return mod.default;
};
