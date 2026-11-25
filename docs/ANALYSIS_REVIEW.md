# Analysis page and coach's summary review

Last updated: 2026-11-25

A review of the analysis page and the coach's summary prompt. It was done by reading the code and the three summaries stored on production (James Bradbury v Howard McCain, James Moore v Howard McCain, Duncan Wraight v Andrew Wilkinson), and by rebuilding those matches from production data to check every figure the summaries quote. The counts the summaries quote were right. The problems are in what the prompt does with them, and a few page bugs and labels.

Each finding has a status. The plan at the end is the order the work is done in.

## The example that started it

Bradbury's forehand loop problem said, in its technical part: "Against serve, check whether the loop is played before you are set."

- 3 of the 10 forehand loops he lost were receives: Howard's serve was the winning shot. The model folded them into a loop problem and took the technical part from the Loop notes ("most looping problems come down to footwork"), adding "against serve". The prompt's rule that receive problems use the Serve entry only applied to problems about receive, so it never fired.
- The Serve entry's notes cover watching the service motion and the bounce, and stepping back for long serves. They don't say what matters most on receive: watch the ball, be ready to move, and above all read the spin.
- Receive is the one moment in a rally the data pins down exactly. If the serve was the winning shot, the loser's last shot was the receive. If the server's losing shot was the serve, the receive won the point. Nothing computed this, so neither the page nor the prompt could talk about receive properly. On production, Moore missed 6 receives against Howard's serve (3 backhand loops, 2 backhand pushes, 1 forehand loop).

## Coach's summary findings

1. **Rules broken.** Bradbury's "Points on your own serve" problem is about unforced errors (8 of 10 came on his serve) but has a tactical part ("plan the third ball") and no technical part, the reverse of the rule.
2. **Unforced advice contradicts the definition.** The page defines an unforced error as one where "you read the spin". The technical advice for unforced loops blamed "the incoming spin being misjudged" (Moore, Wraight). Unforced errors should get advice about execution: timing, footwork, committing to the shot.
3. **Tactical advice is a template.** Nearly every problem says "check the placement, spin and speed… vary them". The best tactical line in all three came from the opponent's numbers: Andrew's backhand loop won 1 and lost 7, so play chops to his backhand. Opponent-data tactics should come first, with at most one or two guide qualities.
4. **Technical parts repeat one note.** "Most looping problems come from footwork" is in all three summaries. Each shot has one note whatever the situation, so receive needs its own guidance.
5. **Rules of the game.** It suggested "a moment at the towel" after two points lost. Towelling is only allowed after every 6 points and at the change of ends, and each player gets one timeout a match.
6. **The model does arithmetic.** The prompt asked it to count late-set unforced errors, slow starts, leads lost and runs from 70 to 85 point rows, with an ambiguous threshold ("compared with the rest of the match"). That is the largest source of variation between runs.

## Page findings

7. **"From 9-all" was mislabelled.** It also counted every point once either player reached 10, so 10-3 counted. In the Bradbury match 8 of those points weren't at 9-9 or later, and the error reached Wraight's headline ("won 3 and lost 6 points from 9-all").
8. **Plural bug.** The Work on card read "5 of your 9 losing backhand pushs".
9. **Weak card.** "Lost set 2 from 3-1 up" (Moore) fired on a 2-point lead early in a set that finished 6-11.
10. **Two definitions of late in a set.** The page used "from the 16th point on", the prompt "once either player reaches 8".
11. **Pips chop block is `defence` on production.** The shot balance design put chop block in control. The user confirmed it's defence, so the definition changed: defence is defending with backspin or from distance (chop, chop block, fish, lob), not just away from the table. Migration `20261125150000_chop_block_defence.sql` brings local stacks into line.
12. **No receive view.** "On their serve" counts every point Howard served, whatever happened in the rally. A small serve and receive block makes it clear.
13. **"What decided it" included Scouting cards**, which didn't decide anything.
14. **The page repeats itself.** The same shot counts appear in the cards, the unforced table, the shot balance chart, the shots table and the patterns.

## Making the summary repeatable

- Compute in `analysis.ts` everything the prompt used to ask the model to count. The page and the prompt then share the numbers.
- Give each problem a `kind`: `shot`, `unforced`, `receive`, `serve` or `situation`. The prompt says which notes each kind uses, and the validator clears the tactical part of an `unforced` problem.
- Receive guidance written from the user's own words, used for every `receive` problem.
- A small eval: the production matches plus a checklist script, run before a prompt change ships.

## Plan and status

| Step | Covers | Status |
| --- | --- | --- |
| 1. Page bugs: close finishes, plural, swing card, one definition of late | 7, 8, 9, 10, 13 | Done |
| 2. Serve and receive in the analysis and on the page | 12, the example | Done |
| 3. Mental-side facts computed in code | 6 | Done |
| 4. Prompt rewrite with `kind`, receive guidance, unforced and tactical rules, game rules | 1–5 | Done |
| 5. Eval script, run on the production matches | repeatability | Done |
| 6. Page order and repetition | 14 | Done |
| 7. `SUMMARY_VERSION` bump, docs, ship | | Done, version 6 |

Item 11 was settled by the user: chop block is defence.

## What changed

- **Close finishes.** "From 9-all" became "From 8-all": points played with both players on 8 or more (`isFromEightAll`). The same definition is used for the headline tile, the unforced tile, the "Errors from 8-all" card and the prompt. `unforced.bunchedLate` is true when 3 or more unforced errors came from 8-all, at least twice as often per point as in the rest of the match. Only then does the summary mention nerves.
- **Cards.** A lost lead or a comeback needs a lead of 3, or 2 with the leader on 8 or more. Plurals use `pluralShot`. The cards' heading is "Main findings".
- **Serve and receive.** `serveReceive` in the analysis, keyed by server: serve winners (split into missed receives by shot, and no return), receive winners by shot, faults, and the longer rallies. Each point row has `decidedBy` (`serve` or `receive`). The page has a "Serve and receive" section, and the scouting section no longer has its own serve card.
- **Set facts.** Each set has `afterSix`, `biggestLead` for each side and `closingRun`. The summary input sends these instead of the per-point gaps, and only runs of 4 or more.
- **Page order.** Tiles, main findings, serve and receive, your shots, unforced errors, patterns, shot balance, progression, scouting. The unforced section lost its by-shot table, because the shots table has the unforced column.
- **Prompt.** Each problem has a `kind` (`shot`, `unforced`, `receive`, `serve`, `situation`), and the kind decides where the advice comes from. `enforceKinds` clears tactical advice on unforced problems and technical advice on situations before validation. Receive problems always use `RECEIVE_GUIDANCE` in `shotGuide.ts`, written from the user's own description, never the receiving stroke's notes. Unforced errors are never put down to misreading spin. Tactical advice comes from the opponent's numbers first, then at most two guide qualities. The towelling and timeout rules are stated. Three or four problems, at most two mental notes, fields under 60 words, the whole summary under 550. "Record" is gone from the prompt and banned in the output.
- **Admin.** The Serve notes are now for serving only, and the hint shows the fixed receive guidance.

## Eval

`scripts/summary-eval.ts` exports the matches that have summaries (read-only), runs the prompt with the function's settings, and checks each output: the validator, kind rules, em dashes, curly quotes, markdown, style names, "record" or "log", towelling, nerves without `bunchedLate`, footwork on receive, spin-reading on unforced errors, counts in every detail, the result in the headline, and lengths. Usage is in the file header. Keep the exported data outside the repo, because it holds real names.

Run on 2026-11-25 against the three production matches: 9 summaries in all, no failures, about $0.90. The problem kinds were the same across two runs for two of the three matches. Every run went over the original 450-word cap, so the cap became 550, which is what the model writes in practice.

## Left for the user

- **Serve notes.** The user is clearing them. The production Serve notes are about receiving ("watching the service motion... stepping back for long serves"). The receive guidance now covers that, so rewrite them on `/admin/shots` as notes on serving, or clear them.
- **Push notes.** The user is updating them. The push notes put long pushes down to misreading the incoming spin. For unforced push errors the summary is told not to blame spin reading, so a line on execution (contact, bat angle, length control) would give it something to use.
