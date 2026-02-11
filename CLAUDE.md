# Castle of Arcana

Roguelike fantasy na platformę ForkArcade. Gracz eksploruje opuszczony zamek pełen magicznych stworzeń, zbiera czary i ekwipunek, wznosi się po piętrach aż do walki z Arcymagiem.

## Architektura gry

Cała logika w jednym pliku `game.js`, renderowanie na `<canvas id="game">` (800x600).
SDK podpięty w `index.html` — nie modyfikuj tagu `<script>` z SDK.

### Struktura game.js

- **Stałe i konfiguracja** — rozmiar tile'a, kolory, definicje wrogów/itemów
- **Generacja dungeonu (BSP)** — `generateMap()` tworzy pokoje i korytarze
- **FOV (raycasting)** — `computeFOV()` oblicza widoczne tile'e
- **Combat** — `doAttack()` bump-to-attack, turowy
- **System zaklęć** — `castSpell()`: Heal, Fireball, Lightning, Ice Shield, Teleport
- **Przedmioty** — `pickupItem()`: bronie, zbroje, mikstury, mana, złoto, księgi zaklęć
- **Spotkania fabularne** — `triggerEncounter()`: Przeklęty Kryształ, Uwięziony Mag (Y/N choice)
- **AI wrogów** — `enemyTurns()`: ruszaj się ku graczowi gdy widoczny, atakuj gdy obok
- **Renderer** — `render()`: mapa, UI top bar, wiadomości, efekty
- **Narracja** — obiekt `narrative` z grafem i zmiennymi

### Piętra zamku

| Floor | Nazwa | Wrogowie |
|-------|-------|----------|
| 1 | Zamkowe Piwnice | Giant Rat, Phantom |
| 2 | Starożytna Biblioteka | Phantom, Dark Mage |
| 3 | Zbrojownia | Phantom, Dark Mage, Enchanted Armor |
| 4 | Wieża Magów | Dark Mage, Enchanted Armor, Arcane Golem |
| 5 | Komnata Arcymaga | Arcane Golem, The Archmage (boss) |

### Sterowanie

`Arrows/WASD` ruch | `Q` mikstura | `E` mana | `1-5` zaklęcia | `Space` czekaj | `R` restart

## SDK ForkArcade

Gra działa w iframe na platformie. Komunikacja przez postMessage.

```js
ForkArcade.onReady(cb)           // start gry po połączeniu z platformą
ForkArcade.submitScore(score)    // wyślij wynik (po śmierci lub zwycięstwie)
ForkArcade.getPlayer()           // info o zalogowanym graczu (Promise)
ForkArcade.updateNarrative(data) // raportuj stan narracji (fire-and-forget)
```

## Scoring

```
score = (floor * 100) + (kills * 10) + gold + (itemsFound * 25) + (boss_defeated ? 500 : 0)
```

## Warstwa narracji

Obiekt `narrative` w game.js. Platforma wyświetla panel narracyjny w real-time.

```js
narrative.transition(nodeId, event)     // przejdź do node'a, wyślij event
narrative.setVar(name, value, reason)   // zmień zmienną, wyślij event
```

### Aktualny graf narracji

- Nodes: castle-gate → floor-1 → cursed-artifact (choice) → floor-2 → imprisoned-wizard (choice) → floor-3 → floor-4 → arcane-check (condition) → floor-5 → victory/death
- Zmienne: `arcane_power` (0-10, pasek), `allies_freed` (0-3), `cursed` (bool), `boss_defeated` (bool)
- Typy nodów: `scene` (lokacja), `choice` (decyzja Y/N), `condition` (warunek)

Przy dodawaniu nowych mechanik — rozbudowuj graf o nowe nodes/edges i zmienne.

## Wersjonowanie

Gra ewoluuje przez GitHub issues. Gdy issue dostanie label `evolve`, GitHub Actions odpala Claude Code, który implementuje feature i otwiera PR. Po merge, workflow tworzy snapshot w `/versions/v{N}/`.

- Nie modyfikuj ręcznie plików w katalogu `/versions/`
- Nie modyfikuj workflow files w `.github/`
- Metadata wersji w `.forkarcade.json` (pole `versions`)

## Publikowanie

Masz dostęp do narzędzi MCP (skonfigurowane w `.mcp.json`):

- `validate_game` — sprawdź czy SDK podpięty, submitScore wywołany, index.html OK
- `publish_game` — push do GitHub + włącz GitHub Pages + tworzy version snapshot
- `get_versions` — pokaż historię wersji

Przed publikacją zawsze wywołaj `validate_game`. Ścieżka do gry to bieżący katalog.

## Konwencje

- Inline styles (brak CSS framework)
- Vanilla JS, ESM nie wymagany (plain script)
- Canvas 800x600, tile 20x20, mapa 40x26
- Kolorystyka: ciemny fiolet/niebieski (magiczny klimat)
- Prompty i CLAUDE.md po polsku
