# Cricket Stats Sharing and Best XI

## What will be built
- Add a downloadable, story-sized PNG stats card from player profiles, using the player's photo, team identity, key batting/bowling numbers, and the existing cyan cricket visual style.
- Add a matching downloadable team stats card from team profiles, featuring its logo and recorded performance figures.
- Add a public Best XI page with role filters, an automatic top-XI selection from registered players' statistics, and manual player swaps while maintaining 4 batters, 2 all-rounders, 1 wicketkeeper, and 4 bowlers.

## Technical approach
- Render share cards from profile data in the browser and download them as PNG; no server or new stored data is needed.
- Build the XI from existing public player and career-stat records, with deterministic ranking and visible empty-role states when the roster cannot fill a position.
- Add the page to app routing and navigation; test selection rules and verify both share-card downloads in the preview.
