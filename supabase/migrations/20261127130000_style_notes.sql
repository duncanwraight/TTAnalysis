-- Replace the six starting styles with the ten the coach uses, and fill in their notes.
-- Chopper and Blocker are renamed so any match or player already set to them keeps a style.
-- The other three starting styles are deleted; matches and players using them go back to no style.

UPDATE public.play_styles SET name = 'Classical defender'
WHERE name = 'Chopper' AND NOT EXISTS (SELECT 1 FROM public.play_styles WHERE name = 'Classical defender');

UPDATE public.play_styles SET name = 'Inverted push-blocker'
WHERE name = 'Blocker' AND NOT EXISTS (SELECT 1 FROM public.play_styles WHERE name = 'Inverted push-blocker');

DELETE FROM public.play_styles WHERE name IN ('Forehand attacker', 'Close-to-table hitter', 'All-rounder', 'Chopper', 'Blocker');

INSERT INTO public.play_styles (name, description, display_order, as_notes, against_notes) VALUES
(
  'Two-winged looper',
  'Attacks with topspin loops off both wings and looks to open up first',
  1,
  $$Wants to attack first and keep attacking. Most of the player's shots should be attack, and most attacks should be loops, on both forehand and backhand. Flat hits and smashes should be a small share of the attacks, and should win far more often than they lose; if they lose often, the player is hitting balls that should be looped. Control is fine when it sets up the attack, and defence should be rare. A large share of control or defence means the player isn't getting in first, so look at serve, receive and the third ball for the reason.$$,
  $$Stop them attacking first. Serve and push short with varied spin so the first loop is hard to play, and look to attack first. Against their loops, block with placement (wide to either side, or at the crossover) and vary the speed of the block rather than trying to match the power. In the opponent's shots, check which wing's loops win and which miss, and whether their attacks come off their own serve or off the player's receive.$$
),
(
  'Penhold attacker',
  'Controls with the backhand and attacks with the forehand, using loops, flat hits or smashes',
  2,
  $$Usually controls with the backhand and attacks with the forehand. Forehand attacks can be loops, flat hits or smashes, so a mix of them is normal. Most of the attack should come from the forehand and most of the control from the backhand. Check whether the forehand attacks win more than they lose, and whether the backhand control is losing points or setting up the forehand.$$,
  $$Make them use the backhand. Play into the backhand, then switch wide to the forehand to test the footwork. Short serves and pushes make the forehand attack harder to start. In the opponent's shots, check whether their backhand control loses points, and how often their forehand attack wins once it gets in.$$
),
(
  'Inverted slapper',
  'Pushes and blocks, then flat-hits or smashes loose balls, mostly with the forehand',
  3,
  $$Plays a control game of pushes and blocks, waiting for a loose ball to flat-hit or smash, usually with the forehand. Most shots should be control, with a smaller share of flat hits and smashes. Check how many of those hits lose points. If a lot do, the player may be over-hitting, impatient, or misreading spin. Balls that are very low and long, or carry heavy backspin or topspin, can't be flat-hit reliably, and should be pushed, blocked or looped instead.$$,
  $$Don't give them a ball to hit. Push long with heavy backspin, loop with plenty of spin rather than pace, and vary the spin so a flat hit is a risk. In the opponent's shots, check how often their hits win against how often they miss, and which of the player's shots gave them the chance, such as a push that went long or a loop without enough spin.$$
),
(
  'Inverted push-blocker',
  'Control player with inverted rubber who pushes and blocks, and picks attacks carefully',
  4,
  $$A control player. Most shots should be pushes and blocks, and attacks have to be chosen carefully. If the player loses a lot of points on their own attacks, it may be impatience, or they may be trying to force the match against an opponent they're struggling to control. Check whether the control shots win more than they lose, and what came before the attacks that lost.$$,
  $$Be patient and pick the right ball to attack. They want to keep the ball in play and wait for a mistake, so don't force attacks off well-placed pushes. Vary the spin and length of the pushes to get a ball worth attacking, then commit to it. Their blocks depend on reading the loop, so vary its spin and speed. In the opponent's shots, check whether they win more points from the player's errors than from their own attacks.$$
),
(
  'Attacking retriever',
  'Attacks plenty but is happy to move back from the table and defend',
  5,
  $$A mix of the two-winged looper and the retriever: attacks plenty, but is also happy to move away from the table and defend. As with any hybrid style, check the split between attack and defence, and which of the two wins and loses more. It can drift too far either way. Too much defence and the player stops getting in first; too much attack and they lose points they could have kept alive.$$,
  $$Don't let them settle into either game. Keep them at the table with short balls, then go long and wide, and when they back off, mix drop shots with strong attacks. Look at which part of their game is weaker: can the player bait weak attacks, or exploit weak defence? In the opponent's shots, check whether their attack or their defence wins them more points.$$
),
(
  'Retriever',
  'Plays away from the table, keeping the ball in with control and defence from inverted rubber',
  6,
  $$Plays away from the table. Expect lots of control and defence, with the defence played on inverted rubber (lobs, fishes, chops) rather than pips. Look for a weaker side, such as backhand defence or forehand blocks. Check whether the player is over-attacking and losing points that way, which is most likely against other low-attack players.$$,
  $$Be patient, because they want you to miss. Draw them in with short balls and drop shots, then attack long and wide with spin and placement rather than all-out power. Find the weaker side, such as backhand defence or forehand blocks, and play to it. In the opponent's shots, check which of their defensive and control shots lose points.$$
),
(
  'Attacking pips or anti crab',
  'Long pips or anti on the backhand, using control, defence and spin variation to set up attacks',
  7,
  $$The same game as the pips or anti crab, but uses the control, defence and spin variation to make chances to attack. Attack, control and defence should be fairly even shares. Find any of the three that is noticeably more or less successful than the others.$$,
  $$Keep the ball away from the pips where possible, and watch which side each ball comes off, because the spin depends on it. They attack off balls they've set up with the pips, so expect it after a float or a short ball. Look at which part of their game is weaker: can the player bait weak attacks, or exploit weak defence? In the opponent's shots, check which of attack, control and defence is costing them points, and play to it.$$
),
(
  'Pips or anti crab',
  'Long pips or anti on the backhand, any rubber on the forehand. Controls and defends to force mistakes',
  8,
  $$Uses long pips or anti-spin on the backhand and any rubber on the forehand. Wants to control and defend, forcing the opponent into mistakes with spin variation and changes of speed. Most shots should be control and defence. Check which wing wins and loses points, and how many of the opponent's losing shots are errors drawn by the control and defence.$$,
  $$Be patient and read the spin before choosing the shot, because balls off the pips often carry less spin, or a different spin, than they look. Play to the forehand where possible, vary the speed and spin going into the pips, and only attack the balls that are there to be attacked. In the opponent's shots, check how many of the player's losing shots are errors against the pips side.$$
),
(
  'Modern defender',
  'Chops and pushes from distance, but looks for chances to attack and win points',
  9,
  $$The same idea as the classical defender, but looks to make attacking chances to win points too. As with the attacking pips or anti crab, attack, control and defence should be fairly even shares. Check for over-attacking, defence that's being beaten, and any of the three that's less successful than the others.$$,
  $$Don't give them the attack they're waiting for. Loop with spin and patience rather than pace, and vary the length. When the player has to stop attacking and push, place the push carefully so it's hard to attack well. Expect their attack when they come in to the table, and be ready to block it towards their pips, if they use them, so they can't keep attacking. Look at which part of their game is weaker: can the player bait weak attacks, or exploit weak defence? In the opponent's shots, check whether their attack or their defence wins them more points.$$
),
(
  'Classical defender',
  'Chops and pushes from distance on both wings, often inverted forehand and long pips backhand',
  10,
  $$Rarely loops, but may flat-hit or smash a weak ball. Most shots should be control (pushes) and defence (chops) on both wings. Rubbers can be any mix of inverted, short pips and long pips, most often inverted on the forehand and long pips on the backhand. If the defence is being beaten, it can be a technical problem with the chop, but the cause is often the shot before it: a push with poor placement, too little spin or too little variation, which gave the opponent the attack.$$,
  $$Be patient. Loop with heavy spin and good placement, vary the length and spin, and use drop shots to pull them in before going long again. Attack the crossover, and save flat hits and smashes for balls high enough to hit. In the opponent's shots, check which wing's chops miss, and whether their pushes give the player balls to attack.$$
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  as_notes = EXCLUDED.as_notes,
  against_notes = EXCLUDED.against_notes;

-- Notes for playing against each non-inverted rubber. Left-handed and medium pips stay empty for now.

UPDATE public.kit_notes SET against_notes = $$Most long pips reverse the spin rather than making their own. Without sponge, expect a lot of reversal: a backspin push comes back with light topspin, and a heavy topspin loop comes back with backspin. Grippier long pips, especially with sponge, reverse less and make more spin of their own. Reading the spin is the main difficulty. The player has to know what type and how much spin they put on the ball, and what kind of long pips the opponent uses. Errors against long pips are often a misread of the spin coming back rather than a fault in the stroke.$$
WHERE key = 'long_pips';

UPDATE public.kit_notes SET against_notes = $$There are two kinds of anti, and the match doesn't say which, so advice should hold for both unless the player's notes say. Classic anti has a little grip and mostly returns a float ball, unless the anti player chops hard against topspin, which sends back backspin. Frictionless anti reverses the spin like long pips, and more than most long pips: a heavy topspin loop comes back with heavy backspin. Frictionless anti is also very good at keeping the ball short, which makes it hard for an attacker to start an attack and forces them to loop.$$
WHERE key = 'anti';

UPDATE public.kit_notes SET against_notes = $$Mostly used for blocking, sometimes for chopping. Short pips don't reverse the spin, but they can reduce it, depending on the rubber. Raw short pips take most of the spin off every stroke: a backspin push comes back as a float, and a topspin loop comes back as a float or very light topspin. Grippier short pips play much like inverted, and only take the spin off when the player punches the ball with a flat contact and lots of forward movement. Expect less spin than the stroke suggests.$$
WHERE key = 'short_pips';
