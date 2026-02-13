# Castle of Arcana

Roguelike fantasy for the ForkArcade platform. The player explores an abandoned castle full of magical creatures, collects spells and equipment, and ascends floors to fight the Archmage.

## Game architecture

All logic in a single file `game.js`, rendering on `<canvas id="game">` (800x600).
SDK included in `index.html` — do not modify the SDK `<script>` tag.

### game.js structure

- **Constants and config** — tile size, colors, enemy/item definitions
- **Dungeon generation (BSP)** — `generateMap()` creates rooms and corridors
- **FOV (raycasting)** — `computeFOV()` calculates visible tiles
- **Combat** — `doAttack()` bump-to-attack, turn-based
- **Spell system** — `castSpell()`: Heal, Fireball, Lightning, Ice Shield, Teleport
- **Items** — `pickupItem()`: weapons, armor, potions, mana, gold, spell books
- **Story encounters** — `triggerEncounter()`: Cursed Crystal, Imprisoned Wizard (Y/N choice)
- **Enemy AI** — `enemyTurns()`: move toward player when visible, attack when adjacent
- **Renderer** — `render()`: map, UI top bar, messages, effects
- **Narrative** — `narrative` object with graph and variables

### Castle floors

| Floor | Name | Enemies |
|-------|------|---------|
| 1 | Castle Cellars | Giant Rat, Phantom |
| 2 | Ancient Library | Phantom, Dark Mage |
| 3 | Armory | Phantom, Dark Mage, Enchanted Armor |
| 4 | Mage Tower | Dark Mage, Enchanted Armor, Arcane Golem |
| 5 | Archmage Chamber | Arcane Golem, The Archmage (boss) |

### Controls

`Arrows/WASD` move | `Q` potion | `E` mana | `1-5` spells | `Space` wait | `R` restart

## ForkArcade SDK

The game runs in an iframe on the platform. Communication via postMessage.

```js
ForkArcade.onReady(cb)           // start the game after connecting to the platform
ForkArcade.submitScore(score)    // submit score (on death or victory)
ForkArcade.getPlayer()           // info about the logged-in player (Promise)
ForkArcade.updateNarrative(data) // report narrative state (fire-and-forget)
```

## Scoring

```
score = (floor * 100) + (kills * 10) + gold + (itemsFound * 25) + (boss_defeated ? 500 : 0)
```

## Narrative layer

`narrative` object in game.js. The platform displays a narrative panel in real-time.

```js
narrative.transition(nodeId, event)     // move to node, send event
narrative.setVar(name, value, reason)   // change variable, send event
```

### Current narrative graph

- Nodes: castle-gate → floor-1 → cursed-artifact (choice) → floor-2 → imprisoned-wizard (choice) → floor-3 → floor-4 → arcane-check (condition) → floor-5 → victory/death
- Variables: `arcane_power` (0-10, bar), `allies_freed` (0-3), `cursed` (bool), `boss_defeated` (bool)
- Node types: `scene` (location), `choice` (Y/N decision), `condition` (condition check)

When adding new mechanics — expand the graph with new nodes/edges and variables.

## Versioning

The game evolves through GitHub issues. When an issue gets the `evolve` label, GitHub Actions triggers Claude Code, which implements the feature and opens a PR. After merge, a workflow creates a snapshot in `/versions/v{N}/`.

- Do not manually modify files in the `/versions/` directory
- Do not modify workflow files in `.github/`
- Version metadata in `.forkarcade.json` (`versions` field)

## Publishing

You have access to MCP tools (configured in `.mcp.json`):

- `validate_game` — check if SDK is included, submitScore called, index.html OK
- `publish_game` — push to GitHub + enable GitHub Pages + create version snapshot
- `get_versions` — show version history

Always run `validate_game` before publishing. The game path is the current directory.

## Conventions

- Inline styles (no CSS framework)
- Vanilla JS, ESM not required (plain script)
- Canvas 800x600, tile 20x20, map 40x26
- Color scheme: dark purple/blue (magical atmosphere)
