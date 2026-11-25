import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Scoreboard from '../components/tracker/Scoreboard';
import ShotPicker from '../components/tracker/ShotPicker';
import MatchComplete from '../components/tracker/MatchComplete';
import { Match, MatchSet, ShotInfo } from '../types/database.types';
import { useApi } from '../lib/useApi';
import { useAuth } from '../context/AuthContext';
import { loadShotData, NO_SHOT, SERVICE_FAULT_SHOT, ShotData } from '../lib/shotsApi';
import { isSafeVideoUrl, playerLabel } from '../lib/matchDetails';
import { UNFORCED_ERROR_DEFINITION, shotLabel } from '../lib/analysis';
import '../styles/components/Tracker.css';
import {
  DEFAULT_BEST_OF,
  EMPTY_SET,
  MatchState,
  SetScore,
  Side,
  buildMatchState,
  finishedSets,
  getServer,
  isMatchOver,
  isSetOver,
  lastActionWasEndSet,
  matchScoreString,
  setLeader,
  setScoreString,
} from '../lib/scoring';

// Supabase errors are plain objects with a message, not Error instances
const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Unknown error';
};

const MatchTracker = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const api = useApi();
  const userId = user?.id;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>({
    currentSet: 1,
    sets: [{ ...EMPTY_SET }],
    points: [],
    isMatchComplete: false,
    dbSets: [],
    currentSetId: null
  });

  /* Point Recording State */
  const [selectedWinner, setSelectedWinner] = useState<Side | null>(null);
  const [winningShot, setWinningShot] = useState<ShotInfo | null>(null);
  const [otherShot, setOtherShot] = useState<ShotInfo | null>(null);
  const [isLuckyPoint, setIsLuckyPoint] = useState<boolean>(false);
  const [isUnforcedError, setIsUnforcedError] = useState<boolean>(false);
  const [isWinningShotMinimized, setIsWinningShotMinimized] = useState<boolean>(false);

  // Guards against a second tap starting another save while one is in flight
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mobile detection hook
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Shot names for the folded winning shot summary
  const [shotData, setShotData] = useState<ShotData | null>(null);
  useEffect(() => {
    loadShotData().then(setShotData).catch(() => undefined);
  }, []);

  const bestOf = match?.best_of ?? DEFAULT_BEST_OF;
  const initialServer: Side = match?.initial_server === 'opponent' ? 'opponent' : 'player';
  const canUndo = matchState.points.length > 0;
  const undoesEndSet = lastActionWasEndSet(matchState.sets, matchState.isMatchComplete);

  /* Match Data Loading */
  useEffect(() => {
    let cancelled = false;

    const loadMatchData = async () => {
      setLoading(true);
      setError(null);

      if (!id) {
        setError('No match ID provided');
        setLoading(false);
        return;
      }

      if (!userId) {
        setError('You need to be signed in to enter a match');
        setLoading(false);
        return;
      }

      try {
        const { match, sets, points } = await api.match.getFullMatchById(id);
        if (cancelled) return;

        if (match.user_id !== userId) {
          setError('This match belongs to another account. You can view its analysis but not enter points.');
          return;
        }

        setMatch(match);
        setMatchState(buildMatchState(sets, points, match.best_of ?? DEFAULT_BEST_OF, match.is_complete));
      } catch (err) {
        if (!cancelled) setError(`Failed to load match: ${errorMessage(err)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMatchData();
    return () => {
      cancelled = true;
    };
  }, [id, userId, api]);

  /* Saving helpers */

  // Run a database operation with the double-tap guard held
  const withSaving = async (operation: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await operation();
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  // Write the match score and completion flag, keeping local state in step
  const syncMatchResult = async (sets: SetScore[], allSetsFinished: boolean, isComplete: boolean) => {
    if (!match) return;
    const finished = allSetsFinished ? sets : finishedSets(sets);
    const updates = { match_score: matchScoreString(finished), is_complete: isComplete };
    if (updates.match_score === match.match_score && updates.is_complete === match.is_complete) return;
    await api.match.updateMatch(match.id, updates);
    setMatch(prev => (prev ? { ...prev, ...updates } : prev));
  };

  /* Point Flow Management */
  const resetPointFlow = () => {
    setSelectedWinner(null);
    setWinningShot(null);
    setOtherShot(null);
    setIsLuckyPoint(false);
    setIsUnforcedError(false);
    setIsWinningShotMinimized(false);
  };

  // Who won the point. Changing your mind clears the shots, because which
  // serve shots are allowed depends on who won.
  const handlePlayerSelect = (winner: Side) => {
    if (savingRef.current) return;
    if (winner !== selectedWinner) {
      setWinningShot(null);
      setOtherShot(null);
      setIsWinningShotMinimized(false);
    }
    setSelectedWinner(winner);
  };

  // Handler for when a winning shot is selected
  const handleWinningShotSelect = async (shot: ShotInfo) => {
    if (!shot || !shot.shotId) return;

    setWinningShot(shot);

    // Auto-minimize winning shot section on mobile after selection
    if (isMobile) {
      setIsWinningShotMinimized(true);
    }

    // A service fault ends the point with no shot from the other player
    try {
      const { shots } = await loadShotData();
      const isServiceFault = shots.some(s => s.id === shot.shotId && s.name === SERVICE_FAULT_SHOT);
      if (!isServiceFault || !selectedWinner) return;

      const noShotId = shots.find(s => s.name === NO_SHOT)?.id;
      if (!noShotId) {
        alert('The "no shot" entry is missing from the shot list, so this service fault can\'t be entered automatically. Pick the losing shot yourself.');
        return;
      }

      // A service fault is always an unforced error
      await recordPoint(selectedWinner, shot, { shotId: noShotId, hand: 'fh' }, true);
    } catch (error) {
      console.error('Failed to check for service fault:', error);
    }
  };

  // Handler for when the other shot is selected
  const handleOtherShotSelect = (shot: ShotInfo) => {
    if (!shot || !shot.shotId) return;

    setOtherShot(shot);

    if (winningShot && selectedWinner) {
      recordPoint(selectedWinner, winningShot, shot);
    }
  };

  // Handler for undoing a winning shot selection
  const handleUndoWinningShot = () => {
    setWinningShot(null);
    setIsWinningShotMinimized(false);
  };

  /* Point Recording */
  const recordPoint = (winner: Side, winningShot: ShotInfo, otherShot: ShotInfo, forceUnforced = false) =>
    withSaving(async () => {
      if (!match) {
        resetPointFlow();
        return;
      }

      const setIndex = matchState.currentSet - 1;
      const current = matchState.sets[setIndex];
      const newScore: SetScore = {
        playerScore: current.playerScore + (winner === 'player' ? 1 : 0),
        opponentScore: current.opponentScore + (winner === 'opponent' ? 1 : 0),
      };

      try {
        // Find or create the current set's row
        const findOrCreateSet = async (): Promise<MatchSet> => {
          const existing = (await api.set.getSetsByMatchId(match.id)).find(s => s.set_number === matchState.currentSet);
          return existing ?? api.set.createSet({
            match_id: match.id,
            set_number: matchState.currentSet,
            score: setScoreString(EMPTY_SET),
            player_score: 0,
            opponent_score: 0,
          });
        };
        const setRow = matchState.dbSets.find(s => s.id === matchState.currentSetId) ?? await findOrCreateSet();

        const newPoint = await api.point.createPoint({
          set_id: setRow.id,
          match_id: match.id,
          point_number: current.playerScore + current.opponentScore + 1,
          winner,
          winning_shot_id: winningShot.shotId,
          winning_hand: winningShot.hand,
          other_shot_id: otherShot.shotId,
          other_hand: otherShot.hand,
          notes: '',
          is_lucky_shot: isLuckyPoint,
          is_unforced_error: forceUnforced || isUnforcedError,
        });

        let updatedSetRow: MatchSet;
        try {
          updatedSetRow = await api.set.updateSet(setRow.id, {
            score: setScoreString(newScore),
            player_score: newScore.playerScore,
            opponent_score: newScore.opponentScore,
          });
        } catch (error) {
          // Keep the point and the set score in step
          await api.point.deletePoint(newPoint.id).catch(() => undefined);
          throw error;
        }

        const otherRows = matchState.dbSets.filter(s => s.id !== updatedSetRow.id);
        const dbSets = [...otherRows, updatedSetRow].sort((a, b) => a.set_number - b.set_number);
        const points = [...matchState.points, newPoint];
        const sets = matchState.sets.map((s, i) => (i === setIndex ? newScore : s));

        if (isSetOver(newScore)) {
          const isComplete = isMatchOver(sets, bestOf);
          await syncMatchResult(sets, true, isComplete).catch(err =>
            console.error('Failed to update match score:', err)
          );

          setMatchState(isComplete
            ? { currentSet: matchState.currentSet, sets, points, isMatchComplete: true, dbSets, currentSetId: updatedSetRow.id }
            : {
                currentSet: matchState.currentSet + 1,
                sets: [...sets, { ...EMPTY_SET }],
                points,
                isMatchComplete: false,
                dbSets,
                currentSetId: null,
              });
        } else {
          setMatchState({ ...matchState, sets, points, dbSets, currentSetId: updatedSetRow.id });
        }
      } catch (error) {
        alert(`Couldn't save the point: ${errorMessage(error)}`);
      } finally {
        resetPointFlow();
      }
    });

  /* Point Undo */
  const undoLastPoint = () =>
    withSaving(async () => {
      if (!match || matchState.points.length === 0) return;

      // Straight after End Set, Undo reverses the End Set and leaves the
      // set's points alone. A second Undo then removes the last point.
      if (lastActionWasEndSet(matchState.sets, matchState.isMatchComplete)) {
        try {
          let dbSets = matchState.dbSets;
          if (!matchState.isMatchComplete) {
            // Remove the empty set End Set created for the next set
            const emptySet = dbSets.find(s => s.set_number === matchState.currentSet);
            if (emptySet) await api.set.deleteSet(emptySet.id);
            dbSets = dbSets.filter(s => s.set_number < matchState.currentSet);
          }
          const newState = buildMatchState(dbSets, matchState.points, bestOf, false);
          await syncMatchResult(newState.sets, false, false);
          setMatchState(newState);
        } catch (error) {
          alert(`Failed to undo End Set: ${errorMessage(error)}. Refresh the page to see the saved state.`);
        }
        return;
      }

      // Points are kept in the order they were recorded
      const lastPoint = matchState.points[matchState.points.length - 1];
      const setRow = matchState.dbSets.find(s => s.id === lastPoint.set_id);
      if (!setRow) {
        alert('Could not find the set for the last point. Please refresh and try again.');
        return;
      }

      try {
        await api.point.deletePoint(lastPoint.id);

        const newScore: SetScore = {
          playerScore: Math.max(0, setRow.player_score - (lastPoint.winner === 'player' ? 1 : 0)),
          opponentScore: Math.max(0, setRow.opponent_score - (lastPoint.winner === 'opponent' ? 1 : 0)),
        };
        const updatedSetRow = await api.set.updateSet(setRow.id, {
          score: setScoreString(newScore),
          player_score: newScore.playerScore,
          opponent_score: newScore.opponentScore,
        });

        // Any later sets have no points left in them (the undone point was the
        // most recent), so remove them and return to the undone point's set
        const laterSets = matchState.dbSets.filter(s => s.set_number > setRow.set_number);
        for (const later of laterSets) {
          await api.set.deleteSet(later.id);
        }

        const dbSets = matchState.dbSets
          .filter(s => s.set_number < setRow.set_number)
          .concat(updatedSetRow);
        const points = matchState.points.slice(0, -1);
        const newState = buildMatchState(dbSets, points, bestOf, false);

        await syncMatchResult(newState.sets, false, false);
        setMatchState(newState);
      } catch (error) {
        alert(`Failed to undo the last point: ${errorMessage(error)}. Refresh the page to see the saved state.`);
      }
    });

  /* Set Management */

  // End the current set early, awarding it to whoever is ahead
  const handleEndSet = () =>
    withSaving(async () => {
      if (!match) return;

      const setIndex = matchState.currentSet - 1;
      const current = matchState.sets[setIndex];

      if (setLeader(current) === null) {
        alert('Cannot end set - scores are tied!');
        return;
      }

      try {
        const isComplete = isMatchOver(matchState.sets, bestOf);
        await syncMatchResult(matchState.sets, true, isComplete);

        if (isComplete) {
          setMatchState({ ...matchState, isMatchComplete: true });
          return;
        }

        // Create the next set's row now so a reload knows this set was ended
        const nextSetNumber = matchState.currentSet + 1;
        const nextSet = matchState.dbSets.find(s => s.set_number === nextSetNumber) ?? await api.set.createSet({
          match_id: match.id,
          set_number: nextSetNumber,
          score: setScoreString(EMPTY_SET),
          player_score: 0,
          opponent_score: 0,
        });

        setMatchState({
          currentSet: nextSetNumber,
          sets: [...matchState.sets, { ...EMPTY_SET }],
          points: matchState.points,
          isMatchComplete: false,
          dbSets: [...matchState.dbSets.filter(s => s.id !== nextSet.id), nextSet],
          currentSetId: nextSet.id,
        });
      } catch (error) {
        alert(`Failed to end set: ${errorMessage(error)}`);
      }
    });

  // "You" on your own matches, the player's name on someone else's
  const player = playerLabel(match?.player_name, displayName);
  const opponent = match?.opponent_name || 'Opponent';
  const possessive = (name: string) => (name === 'You' ? 'Your' : `${name}'s`);

  // Calculate who is currently serving
  const getCurrentServer = (): Side =>
    getServer(initialServer, matchState.currentSet, matchState.sets[matchState.currentSet - 1]);

  const shotName = (shot: ShotInfo) => {
    const found = shotData?.shots.find(s => s.id === shot.shotId);
    const category = found && shotData?.categories.find(c => c.id === found.category_id);
    const name = found && category ? shotLabel({ ...found, category: category.name, category_order: category.display_order }) : 'Shot';
    return `${name} ${shot.hand.toUpperCase()}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="state" role="status"><p>Loading the match...</p></div>
      </Layout>
    );
  }

  if (error || !match) {
    return (
      <Layout>
        <div className="state">
          <h2>You can't enter points for this match</h2>
          <p>{error ?? 'The match was not found.'}</p>
          <div className="form-actions">
            <button className="btn primary" onClick={() => navigate('/matches')}>Back to matches</button>
            <button className="btn" onClick={() => window.location.reload()}>Try again</button>
          </div>
        </div>
      </Layout>
    );
  }

  if (matchState.isMatchComplete) {
    return (
      <Layout>
        <MatchComplete
          matchId={match.id}
          playerName={player}
          opponentName={opponent}
          sets={finishedSets(matchState.sets)}
          canUndo={canUndo}
          undoesEndSet={undoesEndSet}
          onUndo={undoLastPoint}
          busy={isSaving}
        />
      </Layout>
    );
  }

  const server = getCurrentServer();
  const currentScore = matchState.sets[matchState.currentSet - 1];
  const currentSetRow = matchState.dbSets.find(s => s.set_number === matchState.currentSet);
  const setPoints = currentSetRow ? matchState.points.filter(p => p.set_id === currentSetRow.id) : [];
  const winnerName = selectedWinner === 'opponent' ? opponent : player;
  const loserName = selectedWinner === 'opponent' ? player : opponent;
  const winnerServed = selectedWinner === server;
  // On a phone the two pickers don't fit side by side, so the winning shot
  // folds away into a summary once it's picked
  const foldWinning = isMobile && winningShot !== null && isWinningShotMinimized;
  const pointInProgress = selectedWinner !== null;

  return (
    <Layout wide>
      <div className={`tracker${pointInProgress ? ' is-recording' : ''}`}>
        <div className="tracker-bar">
          <div className="tracker-heading">
            <Link to="/matches" className="back-link">Matches</Link>
            <h1>{player === 'You' ? `vs ${opponent}` : `${player} vs ${opponent}`}</h1>
          </div>
          <div className="tracker-tools">
            {isSafeVideoUrl(match.video_url) && (
              <a className="btn quiet" href={match.video_url} target="_blank" rel="noopener noreferrer">Open video</a>
            )}
            {canUndo && (
              <button
                type="button"
                className="btn"
                onClick={undoLastPoint}
                disabled={isSaving || pointInProgress}
                title={undoesEndSet ? 'Reopen the set you just ended' : 'Remove the last point entered'}
              >
                {undoesEndSet ? 'Undo End Set' : 'Undo point'}
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={handleEndSet}
              disabled={isSaving || pointInProgress}
              title="End this set early and award it to whoever is ahead"
            >
              End set
            </button>
          </div>
        </div>

        <Scoreboard
          playerName={player}
          opponentName={opponent}
          currentSet={matchState.currentSet}
          bestOf={bestOf}
          score={currentScore}
          finishedSets={matchState.sets.slice(0, matchState.currentSet - 1)}
          server={server}
          setPoints={setPoints}
          winner={selectedWinner}
          onPickWinner={handlePlayerSelect}
          disabled={isSaving}
        />

        {!pointInProgress ? (
          <p className="tracker-prompt">Who won the point? Tap their side of the score.</p>
        ) : (
          <section className="card point-entry" aria-label="Enter the point">
            <div className="point-entry-head">
              <div className="point-flags">
                <button type="button" className="toggle" aria-pressed={isLuckyPoint} onClick={() => setIsLuckyPoint(v => !v)}>
                  Lucky <span className="faint">net or edge</span>
                </button>
                <button type="button" className="toggle" aria-pressed={isUnforcedError} onClick={() => setIsUnforcedError(v => !v)} title={UNFORCED_ERROR_DEFINITION}>
                  Unforced error <span className="faint">losing shot</span>
                </button>
              </div>
              <button type="button" className="btn quiet small" onClick={resetPointFlow} title="Clear this point without saving it">
                Cancel point
              </button>
            </div>

            <div className="shot-columns">
              <div className="shot-column">
                <h2 id="winning-shot-title">{possessive(winnerName)} winning shot</h2>
                {foldWinning && winningShot ? (
                  <div className="shot-summary">
                    <span>{shotName(winningShot)}</span>
                    <button type="button" className="btn small" onClick={handleUndoWinningShot}>Change</button>
                  </div>
                ) : (
                  <ShotPicker
                    id="winning-shot"
                    title={`${possessive(winnerName)} winning shot`}
                    selected={winningShot}
                    onSelect={handleWinningShotSelect}
                    sideServed={winnerServed}
                    disabled={isSaving}
                  />
                )}
              </div>

              {(!isMobile || winningShot !== null) && (
                <div className={`shot-column${winningShot === null ? ' is-waiting' : ''}`}>
                  <h2 id="losing-shot-title">{possessive(loserName)} losing shot</h2>
                  <ShotPicker
                    id="losing-shot"
                    title={`${possessive(loserName)} losing shot`}
                    selected={otherShot}
                    onSelect={handleOtherShotSelect}
                    sideServed={!winnerServed}
                    disabled={winningShot === null || isSaving}
                  />
                </div>
              )}
            </div>
            <p className="point-entry-note faint">
              {winningShot === null ? 'Pick the winning shot first. ' : ''}The point saves as soon as you pick the losing shot.
            </p>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default MatchTracker;
