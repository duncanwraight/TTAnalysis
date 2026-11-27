# SEO review

Last updated: 2026-11-27

Status: the technical fixes, the shared page invitation, the FAQ links and help titles were shipped on 2026-11-27. What's left, and who does it, is in *SEO* in `docs/NEXT_STEPS.md`.

A review of how ttanalysis.app shows up in search, and what would bring more players to it. Checked against production on 2026-11-27 with curl, the prerendered HTML, and web searches for what a player would type.

## Where things stand

The foundations are better than most single-page apps. The homepage and all 13 help pages are prerendered, so search engines and AI crawlers get real HTML (about 980 words on the homepage, 270 to 1,100 on each help page) without running JavaScript. Every help page has its own title, description, Open Graph tags and canonical link. Images have width, height and descriptive alt text, and everything below the hero is lazy-loaded. `www`, plain HTTP and the old `tt-analysis.vercel.app` all 308 to `https://ttanalysis.app`.

But the site isn't in search yet in any useful sense. A search for "ttanalysis.app" returns nothing from the site. Nothing tells Google the site exists (no sitemap, no Search Console), no other site links to it, and the domain is two days old.

Set expectations accordingly. Searches like "table tennis match analysis app" have small volume, and the first page is app store listings (Stupa Analytics, PingPi, Actemo) and tennis apps. Technical fixes make the site indexable and tidy, but they won't bring players on their own. The two things that will are pages answering questions players already search for, and links from the places they already talk. A comparable tool, ttstats.org, is found mainly through its "I built an app" thread on the TableTennisDaily forum.

## 1. Technical problems

### No robots.txt or sitemap

`/robots.txt` and `/sitemap.xml` both return the app's empty HTML shell with a 200, because the catch-all rewrite sends them to `app.html`. Google copes with a missing robots.txt, but without a sitemap it has to find the help pages by following links from the homepage, which only links to `/help`.

**Fix:** write both in `scripts/prerender.mjs`, from `HELP_ROUTES` plus `/`, so a new help page lands in the sitemap without anyone remembering. robots.txt allows everything and names the sitemap. Vercel serves files that exist before applying rewrites, so they need no rewrite of their own.

### Every other URL is indexable and says it's the homepage

`app.html` is served for every route except `/` and the help pages, and it carries the homepage's title and description. So `/auth`, `/matches`, `/shared/<token>`, `/players` and any made-up URL all return a 200 with the homepage's title and an empty body. To Google these are thin duplicates of the homepage, and unknown URLs are soft 404s.

This matters most for share links. Once someone posts `/shared/<token>` on a forum, Google can find it. Googlebot runs JavaScript, and the page sends the token from its own URL, so the rendered page would show that player's match in search results under the homepage's title. The owner chose to share it, but they didn't choose to have it in Google.

**Fix:** add `<meta name="robots" content="noindex">` to `app.html` only, in `prerender.mjs`. The homepage and help pages stay indexable. This also deals with the soft 404s: a real 404 status for unknown paths would need routing logic the catch-all can't express, and noindex gets the same result for search. Don't block these paths in robots.txt, because Google has to crawl a page to see its noindex.

### Small duplicates and missing canonicals

- The homepage has no canonical link. Add `<link rel="canonical" href="https://ttanalysis.app/">` to `dist/index.html` (not `app.html`).
- `/help/` and `/help` both return the contents page with a 200. The canonical covers it, but `"trailingSlash": false` in `vercel.json` makes it a redirect and closes the question.

### Hashed assets aren't cached

Files under `/assets/` have content hashes in their names but are served with `cache-control: public, max-age=0, must-revalidate`, so every repeat visit revalidates every script, stylesheet and screenshot. Add a header rule in `vercel.json` for `/assets/(.*)`: `public, max-age=31536000, immutable`. Repeat visits get faster, and it costs nothing.

### Favicon

There's only `favicon.svg`. `/favicon.ico` returns the HTML shell. Google shows the site's icon next to every result and accepts SVG, so this is minor, but an `apple-touch-icon` (180px PNG) and a real `favicon.ico` cover browsers, bookmarks and home screens that don't use the SVG.

### Structured data

There is none. Two small blocks of JSON-LD on the homepage:

- `WebSite` with `name: "TT Analysis"`, so Google shows "TT Analysis" as the site name in results rather than guessing from the domain.
- `WebApplication` with the category (sports), that it runs in a browser, and an `offers` price of 0. This helps Google and AI search describe it correctly as a free web app.

The homepage's FAQ could carry `FAQPage` markup, but Google stopped showing FAQ rich results for most sites in 2023. Not worth it unless it's free to add alongside the others.

### Performance

Written before Lighthouse could be run, so these are from measured sizes. Lighthouse was run later the same day; the scores and what was fixed from them are under *SEO* in NEXT_STEPS.md.

- The homepage loads 136 kB of JavaScript (brotli), 8 kB of CSS and two hero screenshots (73 kB and 35 kB). That's light. The JavaScript is the whole app's main bundle, but since the page is prerendered, it doesn't hold back the first paint.
- The Google Fonts stylesheet (two families, five weights) blocks rendering and adds two third-party connections. Self-hosting Inter from `/assets/` with `font-display: swap` removes both.
- The hero screenshot is probably the Largest Contentful Paint. `fetchpriority="high"` on it would tell the browser to fetch it first.

Worth running Lighthouse on mobile before and after these, so there's a number to compare.

## 2. On-page

### The words "table tennis" barely appear

The title and meta description say it. The visible text doesn't: the homepage body uses "table tennis" zero times, and across 9,000 words of help it appears once. The copy talks about loops, blocks, sets and league matches, which a person reads as table tennis without being told. A brand-new domain with no links gets less benefit of the doubt from a search engine, and "ping pong" (the term most non-UK searchers use) doesn't appear anywhere.

This isn't a case for stuffing keywords. A few places where it reads naturally:

- The homepage eyebrow, "For league players and their coaches", could name the sport ("For table tennis league players and their coaches").
- The lede or the "How it works" heading could say "table tennis match" once.
- Help page titles: "Glossary | TT Analysis help" could be "Table tennis match analysis glossary | TT Analysis". The contents page's description already names the app but not the sport.
- The glossary entries most worth searching for (third-ball attack, unforced error, long pips, chop block) could say what they mean in table tennis terms in their first line.

Copy changes go past the user before shipping. The brochure's wording was rewritten and agreed with the user (section 1 of NEXT_STEPS.md), so offer options rather than rewriting.

### Titles and descriptions

- Homepage title, "TT Analysis: table tennis match analysis from video" (51 characters), is good. It leads with the brand and contains the phrase people would search.
- The H1, "Your backhand loop won 5 and lost 12.", is a strong hook and should stay. The title carries the keywords.
- Help titles all end "| TT Analysis help". Fine, but titles like "Your first match, from video to analysis" would be found more often as "How to analyse a table tennis match from video".

### Internal links

The homepage links to `/help` but no individual help page. One link from the FAQ ("How long does it take to enter a match?" to `/help/first-match`, "Do I have to enter every shot?" to `/help/two-shots`) passes the homepage's weight to the pages most likely to rank.

## 3. Measurement

Nothing measures search or traffic today, so there's no way to know what works.

- **Google Search Console.** Add ttanalysis.app as a domain property. Verification is a TXT record in Cloudflare, which can be added with the existing token. Then submit the sitemap and request indexing for the homepage and the help contents page. Search Console is also the only way to see which searches find the site.
- **Bing Webmaster Tools.** Import from Search Console in one click. Bing's index feeds DuckDuckGo, Copilot and ChatGPT's search.
- **Vercel Web Analytics.** Free on the Hobby plan, cookieless (so no consent banner), and shows referrers: which forum post or search brought people in. It's a script tag and a dashboard toggle.

## 4. Content: what would bring players

This is where the growth is. Two kinds of page fit the app and its voice.

### Playing against styles and rubbers

Club players search for how to play against a particular opponent far more than for analysis apps: "how to play against long pips", "how to beat a chopper", "how to play against anti spin", "how to play against a pusher". The app already holds the user's reviewed tactical notes for ten styles and for short, long and anti rubbers on `/admin/styles`.

Turned into public guides at `/guides/<slug>` (prerendered like help), each page would answer the search, use the same notes the coach's summary uses, and end by pointing at what the analysis shows: "after the match, check whether your pushes to their backhand won or lost". These are reader-first pages that happen to lead to the app, which is the kind Google rewards.

Things to decide first:

- Whether the notes are ready to be public. They're written for a model, so each needs writing up as prose, in the user's voice, and checking by the user.
- Which three to start with. Long pips, choppers and pushers are likely the most searched.
- Whether the guides read from the database at build time or are MDX copies. MDX is simpler and matches help. A database read keeps one source, but the build would need Supabase access.

### How to analyse a match from video

"How to analyse your table tennis match video" returns mostly academic papers and one practical post on Joola's blog. That's a thin field. A guide on what to look for (serve and receive, who attacks first, which shot loses points late in sets) answers it directly, and the app is the obvious next step. Much of `first-match` and `two-shots` already covers this, written for people who have signed up. A version for people who haven't, with "table tennis" in the title, is a different page.

### A public sample match

The homepage's "Open the sample match" button scrolls to screenshots. A real, read-only analysis of the Sam Carter sample match on production, at a stable URL like `/sample`, would let people try the analysis page before creating an account, and gives forum posts and coaches something to link to. It needs the sample match on production under an account that isn't a person's, shared with a token, and a route that opens it. Leave it out of the noindex if it's meant to rank.

## 5. Off-site: where players already are

For the first few months, links from table tennis communities will bring more players than search, and they're also what makes Google trust a new domain.

- **TableTennisDaily forum.** An "I built an app" thread in the equipment or general section, written plainly by the user with the sample match link. This is how ttstats.org got found.
- **Reddit r/tabletennis.** Same idea, as a post asking for feedback rather than an announcement.
- **League and club sites.** UK county leagues and clubs often have a links or resources page. A short email to a few club secretaries, or the user's own club and league, is worth more than any directory.
- **Coaches who write for club players.** UK coaches with blogs or newsletters about tactics and match play are the best fit for a link, because the coach's summary and player history are built for them.
- **Directories.** AlternativeTo (it lists similar table tennis stats tools) and Product Hunt. Low effort, low value, but they're links.

Share links are a loop worth closing. A coach opening a shared match is exactly who the app is for, and the shared page has no line inviting them to try it on their own matches. A short note at the foot of a shared analysis ("Made with TT Analysis. Film and analyse your own matches.") with a link to the homepage costs nothing and turns every shared link into a referral.

## Suggested order

1. **Technical batch** (one change, no copy decisions): sitemap and robots.txt from `prerender.mjs`, noindex on `app.html`, homepage canonical, trailing slash redirect, asset caching, JSON-LD, apple-touch-icon. Then Search Console, Bing and Vercel Web Analytics.
2. **Share link footer** and FAQ links to help pages.
3. **Copy pass** for "table tennis" on the homepage and help titles, with options for the user.
4. **Lighthouse** on mobile, then fonts and hero priority if the score calls for it.
5. **Off-site posts**, by the user, once the technical batch is live and Search Console is verified.
6. **Content:** the first three style guides, the video analysis guide and the public sample match, each designed with the user first.

## Sources

- Search results checked on 2026-11-27: [Stupa Analytics](https://apps.apple.com/app/id1480094754), [PingPi](https://apps.apple.com/us/app/id6768219425), [Joola: analysing match videos](https://joola.com/lily-zhangs-blog-a-guide-to-understanding-how-to-analyze-your-match-videos/), [TableTennisDaily: I built an app to track table tennis match stats](https://www.tabletennisdaily.com/forum/topics/i-built-an-app-to-track-table-tennis-match-stats.39193/latest), [AlternativeTo](https://alternativeto.net/software/trtt/about/).
