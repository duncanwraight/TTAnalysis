import { Link } from 'react-router';
import '../styles/home.css';
import analysisTop from '../assets/home/analysis-top.webp';
import trackerPhone from '../assets/home/tracker-phone.webp';
import trackerDesktop from '../assets/home/tracker-desktop.webp';
import decided from '../assets/home/decided.webp';
import progression from '../assets/home/progression.webp';
import scouting from '../assets/home/scouting.webp';
import patterns from '../assets/home/patterns.webp';
import summaryTop from '../assets/home/summary-top.webp';
import analysisPhone from '../assets/home/analysis-phone.webp';

/*
 * The signed-out homepage. The screenshots come from a sample match with
 * made-up names (Sam Carter v Alex Morgan); the numbers in the copy match them.
 *
 * Facts that aren't settled yet. Each line or question stays off the page
 * while its value is null.
 */
const ENTRY_TIME: string | null = "A match filmed uncut usually runs about 20 minutes, and at 1.5x speed most take around 15 minutes to enter. It's even quicker if the video has already been trimmed between points: a trimmed match is often half that time.";
const COACH_AVAILABILITY: string | null = 'By invitation';
const COACH_FAQ_ANSWER: string | null = "Not straight away. It's switched on by invitation while we try it out. Everything else is open to every account.";
const PRICING_FAQ_ANSWER: string | null = "Yes. It's free, and there's no payment to set up.";
const CONTACT = null as { label: string; href: string } | null; // e.g. { label: 'email us', href: 'mailto:...' }

const SIGN_UP = '/auth?mode=signup';
const SIGN_IN = '/auth';

const FAQS: { q: string; a: string | null }[] = [
  {
    q: 'Do I have to enter every shot in the rally?',
    a: 'No. You enter two shots for each point: the one that won it and the one that lost it. The losing shot is either the one that set up the winner or the one that missed. You skip the rally in between.',
  },
  { q: 'How long does it take to enter a match?', a: ENTRY_TIME },
  {
    q: 'Do I need a proper camera?',
    a: 'No. Any phone video will do. You go through it afterwards on a phone or a laptop, and the tracker works on both.',
  },
  {
    q: 'Can other people see my matches?',
    a: 'Not unless you share them. Sharing makes a link that anyone can open without an account. If you stop sharing, the link stops working.',
  },
  { q: "Do I get the coach's summary?", a: COACH_FAQ_ANSWER },
  { q: 'Is it free?', a: PRICING_FAQ_ANSWER },
];

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const HomeBrochure = () => (
  <div className="bro">
    <header className="bro-hero">
      <div className="bro-table" aria-hidden="true">
        <span className="net" /><span className="centre" /><span className="edge" />
      </div>

      <nav className="bro-wrap bro-nav" aria-label="Main">
        <a href="#top" className="bro-brand">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <circle cx="13" cy="13" r="12" fill="#ffffff" />
            <circle cx="17" cy="9" r="4" fill="#0b1220" />
          </svg>
          TT Analysis
        </a>
        <div className="bro-nav-links">
          <a href="#how">How it works</a>
          <a href="#analysis">The analysis</a>
          <a href="#coach">Coach's summary</a>
          <a href="#faq">Questions</a>
        </div>
        <Link to={SIGN_IN} className="bro-btn ghost small">Sign in</Link>
      </nav>

      <div id="top" className="bro-wrap bro-hero-grid">
        <div className="bro-hero-copy">
          <p className="bro-eyebrow">For league players and their coaches</p>
          <h1>Your backhand loop won 5 and lost 12.</h1>
          <p className="bro-lede">
            That's from the sample match. Film your own, enter two shots a point and you get the same count for every shot you play.
          </p>
          <div className="bro-actions">
            <Link to={SIGN_UP} className="bro-btn light">Create an account</Link>
            <a href="#analysis" className="bro-btn ghost">Open the sample match</a>
          </div>
          <p className="bro-hero-note">Enter matches on your phone or laptop. Nobody else sees a match until you share a link to it.</p>
        </div>

        <div className="bro-hero-visual">
          <div className="bro-browser">
            <div className="bro-browser-bar" aria-hidden="true">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="url">ttanalysis.app/shared/…</span>
            </div>
            <img className="bro-shot" src={analysisTop} width={1600} height={867}
              alt="Analysis page for a sample match. Sam Carter lost 2-3 to Alex Morgan, winning 39 of 85 points. Under the headline numbers are the What decided it cards." />
          </div>
          <div className="bro-phone">
            <img className="bro-shot" src={trackerPhone} width={560} height={1212}
              alt="The tracker on a phone, at the step where you pick the losing shot for a point." />
          </div>
        </div>
      </div>
      <p className="bro-wrap bro-caption">Sample match. The players and the event are made up.</p>
    </header>

    <main>
      <section id="how" aria-labelledby="how-h" className="bro-wrap bro-how">
        <div className="bro-how-head">
          <h2 id="how-h" className="bro-h2">Enter the shot that won the point and the one that lost it.</h2>
          <p>
            You don't enter the rally in between, which keeps it quick. It's also why the whole analysis talks about winning and losing shots.
            {ENTRY_TIME && <> {ENTRY_TIME}</>}
          </p>
        </div>

        <ol className="bro-steps">
          <li>
            <span className="num">01</span>
            <h3>Film the match</h3>
            <p>Any phone will do, as long as you can see which shot won each point and which one lost it.</p>
          </li>
          <li>
            <span className="num">02</span>
            <h3>Go through it point by point</h3>
            <p>Play it back at 1.25x or 1.5x and it goes quicker. Tap who won, pick the winning shot, then the losing shot. Score, server and sets keep up on their own.</p>
          </li>
          <li className="dark">
            <span className="num">03</span>
            <h3>Open the analysis</h3>
            <p>It's ready as soon as the last point is in, so you can read it straight away or send your coach the link before training.</p>
          </li>
        </ol>

        <div className="bro-how-demo">
          <div className="bro-how-shot">
            <img className="bro-shot" src={trackerDesktop} width={1600} height={907} loading="lazy"
              alt="The tracker on a laptop: a scoreboard where you click either player's side to say who won the point, and a shot picker for the winning shot and the losing shot." />
          </div>
          <div className="bro-point">
            <p className="bro-eyebrow">What you enter for one point</p>
            <div className="bro-point-cards">
              <div className="bro-point-card you">
                <p className="who">Sam won it with</p>
                <p className="shot">Forehand loop</p>
              </div>
              <div className="bro-point-card opp">
                <p className="who">Alex lost it with</p>
                <p className="shot">Backhand push</p>
              </div>
            </div>
            <p>
              Alex's push set up Sam's loop, so the push goes down as the losing shot. If Alex had missed a block instead, the block would be. Blue is always the player and orange the opponent, everywhere on the page.
            </p>
          </div>
        </div>
      </section>

      <section id="analysis" aria-labelledby="an-h" className="bro-wrap bro-analysis">
        <p className="bro-eyebrow">The analysis, from a sample match</p>
        <h2 id="an-h" className="bro-h2">Sam won the first set and still lost 2-3. Here's where it went.</h2>

        <div className="bro-cards">
          <figure className="bro-card wide">
            <figcaption>
              <h3>What decided it</h3>
              <p>The shots and moments that settled the match, each with the count behind it. 5 of Sam's 9 losing forehand loops were unforced.</p>
            </figcaption>
            <div className="bro-card-shot">
              <img className="bro-shot" src={decided} width={1600} height={493} loading="lazy"
                alt="The What decided it section: three cards on how the sets were won and lost, and three on shots. One shot card shows Sam's backhand loop winning 5 points and losing 12." />
            </div>
          </figure>
          <figure className="bro-card">
            <figcaption>
              <h3>Match progression</h3>
              <p>Who was ahead after every point, set by set. Sam led 3-1 in the second and lost six in a row. Alex's runs of 6, 5 and 8 won three sets.</p>
            </figcaption>
            <div className="bro-card-shot capped">
              <img className="bro-shot" src={progression} width={1200} height={783} loading="lazy"
                alt="How each set went: five small charts, one per set, showing the score difference after every point. Sam won sets 1 and 4, 11-7 and 11-6, and lost the other three 6-11, 6-11 and 5-11." />
            </div>
          </figure>
          <figure className="bro-card">
            <figcaption>
              <h3>Scouting the opponent</h3>
              <p>Their winning and losing shots, forehand against backhand, and what their serve did. Alex won 11 of 46 points with the backhand block. Worth reading before the return fixture.</p>
            </figcaption>
            <div className="bro-card-shot capped">
              <img className="bro-shot" src={scouting} width={1200} height={528} loading="lazy"
                alt="Scouting the opponent: Alex's winning and losing shots, forehand against backhand, and what Alex's serve did. Alex's backhand block won 11 points and lost 8." />
            </div>
          </figure>
          <figure className="bro-card wide">
            <figcaption>
              <h3>Patterns</h3>
              <p>The same winning shot against the same losing shot, three times or more, for both players. Alex's backhand block beat Sam's backhand loop 5 times, so it wasn't a one-off.</p>
            </figcaption>
            <div className="bro-card-shot">
              <img className="bro-shot" src={patterns} width={1600} height={490} loading="lazy"
                alt="Patterns: winning and losing shot pairs that happened three times or more, with counts, for Sam and for Alex. One shows Alex's backhand block beating Sam's backhand loop 5 times." />
            </div>
          </figure>
        </div>
      </section>

      <section id="coach" aria-labelledby="coach-h" className="bro-coach">
        <div className="bro-wrap bro-coach-grid">
          <div className="bro-coach-copy">
            <p className="bro-eyebrow">
              Coach's summary{COACH_AVAILABILITY && <> · {COACH_AVAILABILITY}</>}
            </p>
            <h2 id="coach-h" className="bro-h2">A write-up of your match, biggest problem first.</h2>
            <p>
              AI writes it from the points you entered, and it starts with whatever lost you the most. For Sam it was this: "Your backhand loop won 5 and lost 12, the most of any shot. Alex's backhand block beat it 5 times."
            </p>
            <dl>
              <div>
                <dt>Check</dt>
                <dd>What to look for when you watch it back: was it the right ball to go for, and the right shot?</dd>
              </div>
              <div>
                <dt>If it's technical</dt>
                <dd>If the choice was fine and it still missed, the usual causes of that kind of miss.</dd>
              </div>
              <div>
                <dt>The mental side</dt>
                <dd>Leads that slipped, like set 2 from 3-1 up, and runs against you.</dd>
              </div>
            </dl>
            <p className="fine">
              It only sees the two shots you entered for each point. It can't tell spin or placement, so it tells you what to check on the video rather than guessing. If it gets something wrong, add a correction and it rewrites the summary.
            </p>
          </div>
          <div className="bro-coach-shot">
            <img className="bro-shot" src={summaryTop} width={1600} height={1043} loading="lazy"
              alt="The coach's summary for the sample match. Under the headline, the first problem is Sam's backhand loop, which won 5 and lost 12, with Check and If it's technical advice below it." />
          </div>
        </div>
      </section>

      <section id="share" aria-labelledby="share-h" className="bro-wrap bro-share">
        <div className="bro-share-phone">
          <div>
            <img className="bro-shot" src={analysisPhone} width={560} height={1212} loading="lazy"
              alt="The sample match analysis open on a phone." />
          </div>
        </div>
        <div className="bro-share-copy">
          <p className="bro-eyebrow">Sharing</p>
          <h2 id="share-h" className="bro-h2">Send it to your coach before Tuesday's session, or to clubmates who want to know how it went.</h2>
          <div className="bro-share-list">
            <div>
              <Icon>
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
                <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </Icon>
              <h3>A link anyone can open</h3>
              <p>Your coach and clubmates don't need an account to read it. Turn sharing off and the link goes dead.</p>
            </div>
            <div>
              <Icon>
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5" />
                <path d="M9 14h6M9 17h4" />
              </Icon>
              <h3>On paper for the club coach</h3>
              <p>Export the analysis or the coach's summary as a PDF and print it.</p>
            </div>
            <div>
              <Icon>
                <circle cx="9" cy="8" r="3.5" />
                <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
                <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
              </Icon>
              <h3>Enter a match for someone else</h3>
              <p>Analyse your clubmate's County match, or a match for a player you coach. The analysis is written to the player, so "you" still means them.</p>
            </div>
            <div>
              <Icon>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </Icon>
              <h3>Private until you share it</h3>
              <p>Nobody else can see a match until you make a link for it. That includes the team you play next week.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-h" className="bro-wrap bro-faq">
        <div className="bro-faq-head">
          <h2 id="faq-h" className="bro-h2">Questions</h2>
          <p>
            What people ask before they film their first match.
            {CONTACT && <> If yours isn't here, <a href={CONTACT.href}>{CONTACT.label}</a>.</>}
          </p>
        </div>
        <div className="bro-faq-list">
          {FAQS.filter((item) => item.a).map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="cta-h" className="bro-wrap bro-closing">
        <div className="bro-closing-panel">
          <div>
            <h2 id="cta-h" className="bro-h2">Film your next league match.</h2>
            <p>Any phone will do. Go through it at home afterwards, at 1.5x.</p>
          </div>
          <div className="bro-actions">
            <Link to={SIGN_UP} className="bro-btn light">Create an account</Link>
            <Link to={SIGN_IN} className="bro-btn ghost">Sign in</Link>
          </div>
        </div>
      </section>
    </main>

    <footer className="bro-wrap bro-footer">
      <span>TT Analysis</span>
      <span>Two shots a point from your match video, and where the points went</span>
    </footer>
  </div>
);

export default HomeBrochure;
