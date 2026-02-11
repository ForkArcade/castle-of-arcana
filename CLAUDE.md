Ten projekt to gra typu Roguelike na platformę ForkArcade.

## SDK
SDK jest podpięty w index.html. Używaj:
- `ForkArcade.onReady(cb)` — start gry po połączeniu z platformą
- `ForkArcade.submitScore(score)` — wyślij wynik po śmierci gracza
- `ForkArcade.getPlayer()` — info o zalogowanym graczu
- `ForkArcade.updateNarrative(data)` — raportuj stan narracji (graf, zmienne, eventy)

## Typ gry
Proceduralne dungeony, permadeath, tile-based movement, turowy combat.
Gracz eksploruje, walczy bump-to-attack, zbiera loot, schodzi głębiej.

## Scoring
Score = (dungeon_depth * 100) + (enemies_killed * 10) + (gold_collected) + (items_found * 25)

## Warstwa narracji
Gra ma wbudowany narrative engine (`narrative` obiekt w game.js). Platforma wyświetla panel narracyjny w czasie rzeczywistym.

- `narrative.transition(nodeId, event)` — przejdź do nowego node'a w grafie, wyślij event
- `narrative.setVar(name, value, reason)` — zmień zmienną fabularną, wyślij event
- Rozbuduj `narrative.graph` o nowe nodes i edges dopasowane do fabuły gry
- Typy nodów: `scene` (scena/lokacja), `choice` (decyzja gracza), `condition` (warunek)
- Zmienne numeryczne (0-10) wyświetlane jako paski, boolean jako checkmarks

## Plik wejściowy
Cała logika gry w `game.js`. Renderowanie na `<canvas id="game">`.
