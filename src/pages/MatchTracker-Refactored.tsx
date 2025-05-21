import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PlayerPanel from '../components/PlayerPanel';
import ShotSelector from '../components/ShotSelector';
import ScoreBoard from '../components/ScoreBoard';
import PointHistory from '../components/PointHistory';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { MatchProvider, useMatch } from '../context/MatchContext';

const MatchTrackerContent = () => {
  const navigate = useNavigate();
  const { 
    match, 
    loading, 
    matchState, 
    selectedWinner,
    winningShot,
    otherShot,
    canUndo,
    handlePlayerSelect,
    handleWinningShotSelect,
    handleOtherShotSelect,
    handleUndoWinningShot,
    handleUndoOtherShot,
    undoLastPoint,
    resetPointFlow,
    getCurrentServer,
    recordPoint,
    advanceToNextSet
  } = useMatch();
  
  // State for end match confirmation
  const [showEndMatchConfirm, setShowEndMatchConfirm] = useState<boolean>(false);
  
  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading match...</p>
      </div>
    );
  }
  
  // If the match is complete, show the match summary
  if (matchState.isMatchComplete) {
    return (
      <div className="match-complete-container">
        <h2>Match Complete</h2>
        
        <div className="match-result">
          <h3>Final Score</h3>
          <p className="final-score">
            You {matchState.sets.filter(set => set.playerScore > set.opponentScore).length} - {' '}
            {matchState.sets.filter(set => set.opponentScore > set.playerScore).length} {match?.opponent_name}
          </p>
        </div>
        
        <div className="set-scores">
          <h3>Set Scores</h3>
          {matchState.sets.map((set, index) => (
            <div key={index} className="set-score-item">
              <span>Set {index + 1}:</span>
              <span>{set.playerScore} - {set.opponentScore}</span>
            </div>
          ))}
        </div>
        
        {/* Point History for the final set */}
        {matchState.points.length > 0 && (
          <div className="match-point-history">
            <h3>Point Flow (Last Set)</h3>
            <PointHistory 
              points={matchState.points}
              currentSet={matchState.currentSet}
              opponentName={match?.opponent_name}
              sets={matchState.dbSets}
              currentSetId={matchState.currentSetId}
            />
          </div>
        )}
        
        <div className="match-actions">
          <Button 
            variant="primary"
            onClick={() => navigate(`/matches/${match?.id}/analysis`)}
          >
            View Analysis
          </Button>
          <Button 
            variant="secondary"
            onClick={() => navigate('/matches')}
          >
            Back to Matches
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="match-tracker-container">
      <ScoreBoard 
        currentSet={matchState.currentSet}
        playerScore={matchState.sets[matchState.currentSet - 1].playerScore} 
        opponentScore={matchState.sets[matchState.currentSet - 1].opponentScore}
        opponentName={match?.opponent_name || 'Opponent'}
        currentServer={getCurrentServer()}
        sets={matchState.sets}
      />
      
      {selectedWinner === null ? (
        <>
          {/* Step 1: Select who won the point */}
          <div className="point-selection-instruction">
            <p>Tap on who won the point</p>
          </div>
          
          <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {/* Player Panel with fixed height */}
                <div style={{
                  height: '200px'
                }}>
                  <PlayerPanel 
                    type="player"
                    name="You"
                    onClick={() => handlePlayerSelect('player')}
                  />
                </div>
                
                {/* Set Scores Panel */}
                <Card className="set-scores-panel">
                  <div className="set-scores-title">
                    Set Scores
                  </div>
                  {matchState.sets.length > 0 && (
                    <div className="set-scores-grid">
                      {matchState.sets.map((set, index) => {
                        // Only show completed sets or current set
                        if (index < matchState.currentSet) {
                          const isWin = set.playerScore > set.opponentScore;
                          const isLoss = set.playerScore < set.opponentScore;
                          
                          return (
                            <div 
                              key={index} 
                              className={`set-score-card ${isWin ? 'win' : ''} ${isLoss ? 'loss' : ''}`}
                            >
                              <div className="set-number">
                                Set {index + 1}
                              </div>
                              <div className="set-score-values">
                                <span className="player-set-score">{set.playerScore}</span>
                                <span className="score-separator">-</span>
                                <span className="opponent-set-score">{set.opponentScore}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </Card>
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {/* Opponent Panel with fixed height */}
                <div style={{
                  height: '200px'
                }}>
                  <PlayerPanel 
                    type="opponent"
                    name={match?.opponent_name || 'Opponent'}
                    onClick={() => handlePlayerSelect('opponent')}
                  />
                </div>
                
                {/* Point History Visualization */}
                <Card className="point-history-panel">
                  {matchState.points.length > 0 ? (
                    <PointHistory 
                      points={matchState.points}
                      currentSet={matchState.currentSet}
                      opponentName={match?.opponent_name}
                      sets={matchState.dbSets}
                      currentSetId={matchState.currentSetId}
                    />
                  ) : (
                    <div className="point-history-title">Point History</div>
                  )}
                </Card>
              </div>
            </div>
        </>
      ) : (
        // Step 2: Select both winning and other shots at the same time
        <div className="shot-selection-container">
          
          <div className="shot-selection winning-shot">
            <h3>{selectedWinner === 'player' ? 'Your' : 'Opponent\'s'} Winning Shot:</h3>
            <ShotSelector 
              onSelect={handleWinningShotSelect}
              shotType="winning"
              selected={winningShot}
              onUndo={handleUndoWinningShot}
              currentServer={getCurrentServer()}
              isWinningPlayer={selectedWinner === 'player'}
            />
          </div>
          <div className="shot-selection other-shot">
            <h3>{selectedWinner === 'opponent' ? 'Your' : 'Opponent\'s'} Other Shot:</h3>
            <ShotSelector 
              onSelect={handleOtherShotSelect}
              shotType="other"
              selected={otherShot}
              disabled={winningShot === null}
              onUndo={handleUndoOtherShot}
              currentServer={getCurrentServer()}
              isWinningPlayer={selectedWinner === 'player'}
            />
          </div>
          {winningShot && otherShot && winningShot !== 'no_data' && (
            <div className="submit-shots">
              <Button 
                variant="primary"
                onClick={() => recordPoint(selectedWinner!, winningShot, otherShot)}
                className="record-point-btn"
              >
                Record Point
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* End Match Confirmation */}
      {showEndMatchConfirm && (
        <div className="confirmation-dialog">
          <div className="confirmation-content">
            <h3>End Match?</h3>
            <p>Are you sure you want to end this match? All progress will be saved.</p>
            <div className="confirmation-actions">
              <Button 
                variant="primary"
                onClick={() => navigate('/matches')}
              >
                Yes, End Match
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowEndMatchConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="match-controls">
        <Button 
          variant="secondary"
          onClick={() => setShowEndMatchConfirm(true)}
        >
          End Match
        </Button>
        
        {/* Only show the Back button when we're in the shot selection flow */}
        {selectedWinner !== null && (
          <>
            <Button 
              variant="outline"
              onClick={() => {
                // Step back in the point recording flow
                if (otherShot !== null) {
                  handleUndoOtherShot();
                } else if (winningShot !== null) {
                  handleUndoWinningShot();
                } else if (selectedWinner !== null) {
                  resetPointFlow();
                }
              }}
            >
              Back
            </Button>
            
            {/* No Data button */}
            <Button
              variant="outline"
              className="no-data-btn"
              onClick={() => {
                recordPoint(selectedWinner!, 'no_data', 'no_data');
              }}
              title="Record point without shot data"
            >
              No Data
            </Button>
          </>
        )}
        
        {/* Undo button for removing the last point */}
        {canUndo && selectedWinner === null && (
          <Button 
            variant="outline"
            className="undo-btn"
            onClick={undoLastPoint}
            title="Undo last point"
          >
            ↩️ Undo
          </Button>
        )}
        
        <Button 
          variant="outline"
          onClick={advanceToNextSet}
        >
          Next Set
        </Button>
      </div>
    </div>
  );
};

// Wrapper component to provide MatchContext
const MatchTracker = () => {
  const { id = '' } = useParams<{ id: string }>();

  return (
    <Layout>
      <MatchProvider matchId={id}>
        <MatchTrackerContent />
      </MatchProvider>
    </Layout>
  );
};

export default MatchTracker;