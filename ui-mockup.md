# Table Tennis Analysis App UI Mockup

## Main Match Screen

```
+-----------------------------------------------------+
|  Set 1   |   Player1: 5   |   Opponent: 3   | ⚙️    |
+-----------------------------------------------------+
|                                                     |
|  +-------------------+    +-------------------+     |
|  |                   |    |                   |     |
|  |      PLAYER 1     |    |     OPPONENT      |     |
|  |                   |    |                   |     |
|  |                   |    |                   |     |
|  |    [YOUR PHOTO]   |    |  [OPPONENT PHOTO] |     |
|  |                   |    |                   |     |
|  |                   |    |                   |     |
|  +-------------------+    +-------------------+     |
|                                                     |
|  Tap on who won the point                           |
+-----------------------------------------------------+
```

### Interaction Flow:

1. **Match immediately starts in point recording mode**
   - No need to click "record point" - the app is always ready for the next point

2. **Winning Player Selection**
   - Simply tap on either Player 1 or Opponent panel to indicate who won the point
   - Score automatically updates after completing shot entry

3. **Shot Entry (appears after tapping winner)**
   
```
+-----------------------------------------------------+
|  Set 1   |   Player1: 5   |   Opponent: 3   | ⚙️    |
+-----------------------------------------------------+
|                                                     |
|  PLAYER 1 WON THE POINT                             |
|                                                     |
|  Winning Shot:                                      |
|  +--------+  +--------+  +--------+  +--------+    |
|  | Serve  |  | Forehand|  |Backhand|  |  Push  |    |
|  +--------+  +--------+  +--------+  +--------+    |
|                                                     |
|  +--------+  +--------+  +--------+  +--------+    |
|  |  Loop  |  |  Block |  | Smash  |  |  More  |    |
|  +--------+  +--------+  +--------+  +--------+    |
|                                                     |
|  Other Shot (Opponent's previous shot):             |
|  +--------+  +--------+  +--------+  +--------+    |
|  | Serve  |  | Forehand|  |Backhand|  |  Push  |    |
|  +--------+  +--------+  +--------+  +--------+    |
|                                                     |
|  +--------+  +--------+  +--------+  +--------+    |
|  |  Loop  |  |  Block |  | Smash  |  |  More  |    |
|  +--------+  +--------+  +--------+  +--------+    |
|                                                     |
+-----------------------------------------------------+
```

4. **After shot selection, immediately returns to the main view for next point**

5. **Automated Set Advancement**
   - When a set is complete (first to 11, win by 2), automatically advances to next set
   - "Manual Override" button (not prominently displayed) allows forced set changes

6. **Quick Patterns Feature**
   
```
+-----------------------------------------------------+
|  Set 1   |   Player1: 6   |   Opponent: 3   | ⚙️    |
+-----------------------------------------------------+
|                                                     |
|  PLAYER 1 WON THE POINT                             |
|                                                     |
|  Common Patterns:                                   |
|  +---------------------+  +---------------------+   |
|  | Serve → Opp. Error  |  | Serve → 3rd Ball Atk |   |
|  +---------------------+  +---------------------+   |
|                                                     |
|  +---------------------+  +---------------------+   |
|  | Loop → Opp. Error   |  | Counter → Winner    |   |
|  +---------------------+  +---------------------+   |
|                                                     |
|  Or select shots individually:                      |
|  [Winning Shot] [Other Shot]                        |
|                                                     |
+-----------------------------------------------------+
```

## Smart UI Features

1. **Context-Aware Options**
   - If server won, prominently show service winners
   - If receiving, show receiving options
   - Recent patterns appear more prominently

2. **Gesture Shortcuts**
   - Long press on winner's panel opens quick-select for common patterns
   - Swipe up for winners, swipe down for errors

3. **Auto-Detection for Serving Player**
   - Tracks serving player automatically based on score
   - Visual indicator shows who's serving

## End of Set Screen

```
+-----------------------------------------------------+
|                 SET 1 COMPLETE                      |
|                                                     |
|              Player1  11 - 7  Opponent              |
|                                                     |
|  +-------------------+    +-------------------+     |
|  |   Set Summary:    |    |    Shot Stats:    |     |
|  |                   |    |                   |     |
|  | Serve Points: 5   |    | Forehand Wins: 4  |     |
|  | Return Points: 6  |    | Backhand Wins: 2  |     |
|  |                   |    | Errors Forced: 5  |     |
|  +-------------------+    +-------------------+     |
|                                                     |
|  [CONTINUE TO SET 2]     [END MATCH]                |
|                                                     |
+-----------------------------------------------------+
```

## Match Summary Screen (End of Match)

```
+-----------------------------------------------------+
|                 MATCH COMPLETE                      |
|                                                     |
|           Player1  3 - 1  Opponent                  |
|                                                     |
|  Set Scores:                                        |
|  Set 1: 11-7  Set 2: 7-11  Set 3: 11-6  Set 4: 11-8 |
|                                                     |
|  +-------------------+    +-------------------+     |
|  |   Point Stats:    |    |   Shot Analysis:  |     |
|  |                   |    |                   |     |
|  | Total Points: 72  |    | Best Shot: Loop   |     |
|  | Points Won: 40    |    | Struggle: Receive |     |
|  | Win Rate: 56%     |    | Pattern: 👍👍👍   |     |
|  +-------------------+    +-------------------+     |
|                                                     |
|  [VIEW DETAILED ANALYSIS]   [NEW MATCH]             |
|                                                     |
+-----------------------------------------------------+
```

## Technical Implementation Notes

1. **State Management**
   - Track current set, score, and serving player
   - Maintain match history for undo/redo
   - Store point details with timestamps

2. **Responsive Design**
   - Primary focus on mobile/tablet usage
   - Support landscape orientation for easier interaction
   - Touch-optimized large buttons

3. **Mobile Optimization**
   - Implement swipe gestures
   - Support offline usage
   - Local storage backup