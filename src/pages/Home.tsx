import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { UNFORCED_ERROR_DEFINITION } from '../lib/analysis';
import HomeBrochure from './HomeBrochure';

const STEPS: { title: string; body: React.ReactNode }[] = [
  { title: 'Film the match', body: 'Any phone video will do. You enter the points afterwards, not courtside.' },
  { title: 'Create the match', body: 'Enter the player, the opponent, who served first and how many sets it was.' },
  { title: 'Go through the video point by point', body: 'For each point, tap who won it, then the winning shot.' },
  {
    title: 'Enter the losing shot',
    body: <>The shot that set up the winner, if the loser never got the ball back, or the return that missed.</>,
  },
  {
    title: 'Tick unforced errors',
    body: <>{UNFORCED_ERROR_DEFINITION} Tick these as you go, or afterwards in the points editor.</>,
  },
  { title: 'Read the analysis', body: 'See where points were won and lost, the patterns, and how each set went. Share it with a link.' },
];

const Home = () => {
  const { user, loading } = useAuth();

  // Signed-out visitors get the brochure. Render nothing while the session
  // loads, so a signed-in user doesn't see the brochure flash first.
  if (loading) return null;
  if (!user) return <HomeBrochure />;

  return (
    <Layout>
      <div className="page narrow home">
        <div className="page-head">
          <div>
            <h1>Table tennis match analysis</h1>
            <p>Film a match, enter it point by point, and see what won and lost it.</p>
          </div>
        </div>

        <div className="form-actions">
          <Link to="/matches/new" className="btn primary">New match</Link>
          <Link to="/matches" className="btn">Your matches</Link>
        </div>

        <section className="card home-steps" aria-labelledby="home-how">
          <h2 id="home-how">How it works</h2>
          <ol>
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="home-step-number" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p className="muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Layout>
  );
};

export default Home;
