// ========================
// CASTLE OF ARCANA
// A magical roguelike
// ========================

const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

// ===== CONSTANTS =====
const T = 20
const COLS = 40
const ROWS = 26
const UI_Y = 36
const MSG_Y = 558
const FOV_R = 7
const MAX_FLOOR = 5
const WALL = 0, FLOOR = 1, STAIRS = 2

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

// ===== COLORS =====
const C = {
  bg: '#0a0a1a', uiBg: '#12102a',
  wall: '#1e1638', wallLit: '#362a5c', wallTop: '#4a3a7a',
  floor: '#0d0b1a', floorLit: '#201c3a',
  stairs: '#2a8060', stairsLit: '#40c090',
  hp: '#c44', mp: '#48c', gold: '#da2',
  text: '#ccc', dim: '#666', player: '#4ef',
}

// ===== FLOOR NAMES =====
const FLOOR_NAMES = ['', 'Zamkowe Piwnice', 'Starożytna Biblioteka', 'Zbrojownia', 'Wieża Magów', 'Komnata Arcymaga']

// ===== ENEMY DEFINITIONS =====
const ENEMY_DEFS = {
  rat:      { name: 'Giant Rat',        char: 'r', color: '#a86', hp: 6,  atk: 2, def: 0, xp: 3 },
  phantom:  { name: 'Phantom',          char: 'P', color: '#66a', hp: 8,  atk: 3, def: 0, xp: 5 },
  mage:     { name: 'Dark Mage',        char: 'M', color: '#a4c', hp: 12, atk: 5, def: 1, xp: 10 },
  armor:    { name: 'Enchanted Armor',   char: 'A', color: '#999', hp: 20, atk: 4, def: 4, xp: 15 },
  golem:    { name: 'Arcane Golem',      char: 'G', color: '#c64', hp: 25, atk: 6, def: 3, xp: 20 },
  archmage: { name: 'The Archmage',      char: 'W', color: '#fd4', hp: 50, atk: 8, def: 4, xp: 100 },
}

const FLOOR_ENEMIES = [
  [],
  [['rat', 3], ['phantom', 2]],
  [['phantom', 2], ['mage', 2]],
  [['phantom', 1], ['mage', 2], ['armor', 2]],
  [['mage', 2], ['armor', 1], ['golem', 2]],
  [['golem', 2], ['archmage', 1]],
]

// ===== ITEM DEFINITIONS =====
const WEAPONS = [
  { name: 'Rusty Sword', atk: 2 },
  { name: 'Magic Staff', atk: 4 },
  { name: 'Arcane Blade', atk: 6 },
  { name: 'Crystal Wand', atk: 5 },
]
const ARMORS = [
  { name: 'Cloth Robe', def: 1 },
  { name: 'Chain Mail', def: 3 },
  { name: 'Enchanted Plate', def: 5 },
]
const SPELL_DEFS = ['Fireball', 'Ice Shield', 'Lightning', 'Teleport']

// ===== GAME STATE =====
let floor, map, revealed, visible, player, enemies, items, messages
let gameActive, stats, effects, pendingChoice

// ===== NARRATIVE =====
const narrative = {
  variables: { arcane_power: 0, allies_freed: 0, cursed: false, boss_defeated: false },
  currentNode: 'castle-gate',
  graph: {
    nodes: [
      { id: 'castle-gate', label: 'Brama Zamku', type: 'scene' },
      { id: 'floor-1', label: 'Zamkowe Piwnice', type: 'scene' },
      { id: 'cursed-artifact', label: 'Przeklęty Artefakt', type: 'choice' },
      { id: 'floor-2', label: 'Starożytna Biblioteka', type: 'scene' },
      { id: 'imprisoned-wizard', label: 'Uwięziony Mag', type: 'choice' },
      { id: 'floor-3', label: 'Zbrojownia', type: 'scene' },
      { id: 'floor-4', label: 'Wieża Magów', type: 'scene' },
      { id: 'arcane-check', label: 'Moc Arkana ≥ 3?', type: 'condition' },
      { id: 'floor-5', label: 'Komnata Arcymaga', type: 'scene' },
      { id: 'victory', label: 'Zwycięstwo!', type: 'scene' },
      { id: 'death', label: 'Śmierć', type: 'scene' },
    ],
    edges: [
      { from: 'castle-gate', to: 'floor-1' },
      { from: 'floor-1', to: 'cursed-artifact' },
      { from: 'cursed-artifact', to: 'floor-2', label: 'Dalej' },
      { from: 'floor-2', to: 'imprisoned-wizard' },
      { from: 'imprisoned-wizard', to: 'floor-3', label: 'Dalej' },
      { from: 'floor-3', to: 'floor-4' },
      { from: 'floor-4', to: 'arcane-check' },
      { from: 'arcane-check', to: 'floor-5', label: 'Tak' },
      { from: 'floor-5', to: 'victory', label: 'Pokonaj bossa' },
    ]
  },
  transition(nodeId, event) {
    this.currentNode = nodeId
    ForkArcade.updateNarrative({
      variables: this.variables,
      currentNode: this.currentNode,
      graph: this.graph,
      event
    })
  },
  setVar(name, value, reason) {
    this.variables[name] = value
    ForkArcade.updateNarrative({
      variables: this.variables,
      currentNode: this.currentNode,
      graph: this.graph,
      event: reason || (name + ' = ' + value)
    })
  }
}

// ===== DUNGEON GENERATION (BSP) =====
function generateMap() {
  map = []
  for (let y = 0; y < ROWS; y++) map[y] = new Array(COLS).fill(WALL)
  const rooms = []

  function split(x, y, w, h, depth) {
    if (depth <= 0 || w < 9 || h < 9) {
      const rx = x + 1 + rand(0, 1)
      const ry = y + 1 + rand(0, 1)
      const rw = Math.max(3, w - 3 - rand(0, 1))
      const rh = Math.max(3, h - 3 - rand(0, 1))
      for (let j = ry; j < ry + rh && j < ROWS - 1; j++)
        for (let i = rx; i < rx + rw && i < COLS - 1; i++)
          map[j][i] = FLOOR
      rooms.push({ cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) })
      return
    }
    if (w >= h) {
      const sx = x + 4 + rand(0, Math.max(0, w - 9))
      split(x, y, sx - x, h, depth - 1)
      split(sx, y, x + w - sx, h, depth - 1)
    } else {
      const sy = y + 4 + rand(0, Math.max(0, h - 9))
      split(x, y, w, sy - y, depth - 1)
      split(x, sy, w, y + h - sy, depth - 1)
    }
  }

  split(1, 1, COLS - 2, ROWS - 2, 4)

  // Connect rooms with L-shaped corridors
  for (let i = 1; i < rooms.length; i++) {
    let x = rooms[i - 1].cx, y = rooms[i - 1].cy
    const tx = rooms[i].cx, ty = rooms[i].cy
    while (x !== tx) {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) map[y][x] = FLOOR
      x += x < tx ? 1 : -1
    }
    while (y !== ty) {
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) map[y][x] = FLOOR
      y += y < ty ? 1 : -1
    }
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) map[y][x] = FLOOR
  }

  // Stairs in last room (unless boss floor)
  if (floor < MAX_FLOOR) {
    const last = rooms[rooms.length - 1]
    map[last.cy][last.cx] = STAIRS
  }

  return rooms
}

// ===== FOV (Raycasting) =====
function computeFOV() {
  visible = new Set()
  const px = player.x, py = player.y
  visible.add(px + ',' + py)
  revealed[py][px] = true

  for (let a = 0; a < 720; a++) {
    const rad = (a / 360) * Math.PI
    const dx = Math.cos(rad), dy = Math.sin(rad)
    for (let d = 1; d <= FOV_R; d++) {
      const x = Math.round(px + dx * d)
      const y = Math.round(py + dy * d)
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) break
      visible.add(x + ',' + y)
      revealed[y][x] = true
      if (map[y][x] === WALL) break
    }
  }
}

// ===== HELPERS =====
function occupied(x, y) {
  if (player && player.x === x && player.y === y) return true
  return enemies.some(e => e.x === x && e.y === y && e.hp > 0)
}

function randomFloorTile() {
  let x, y, tries = 0
  do {
    x = rand(1, COLS - 2)
    y = rand(1, ROWS - 2)
    tries++
  } while ((map[y][x] !== FLOOR || occupied(x, y)) && tries < 2000)
  return { x, y }
}

function enemyAt(x, y) { return enemies.find(e => e.x === x && e.y === y && e.hp > 0) }
function itemAt(x, y) { return items.find(i => i.x === x && i.y === y) }

// ===== MESSAGES =====
function msg(text, color) {
  messages.unshift({ text, color: color || '#aaa' })
  if (messages.length > 50) messages.pop()
}

// ===== EFFECTS =====
function addEffect(x, y, color) {
  effects.push({ x, y, color, life: 5 })
}

// ===== COMBAT =====
function doAttack(attacker, defender, isPlayer) {
  const atkTotal = attacker.atk + (attacker.weapon ? attacker.weapon.atk : 0)
  const defTotal = defender.def + (defender.armor ? defender.armor.def : 0)
  const dmg = Math.max(1, atkTotal - defTotal + rand(-1, 2))
  defender.hp -= dmg

  if (isPlayer) {
    addEffect(defender.x, defender.y, '#fa4')
    msg(`You hit ${defender.name} for ${dmg} damage!`, '#fa4')
    if (defender.hp <= 0) {
      msg(`${defender.name} destroyed!`, '#4f4')
      stats.kills++
      player.xp += defender.xp || 0
    }
  } else {
    addEffect(player.x, player.y, '#f44')
    msg(`${attacker.name} hits you for ${dmg}!`, '#f44')
  }
}

// ===== SPELLS =====
function castSpell(index) {
  if (!gameActive || pendingChoice) return
  if (index >= player.spells.length) return
  const spell = player.spells[index]

  switch (spell) {
    case 'Heal':
      if (player.mp < 2) { msg('Not enough mana!', '#f44'); return }
      player.mp -= 2
      const healed = Math.min(15, player.maxHp - player.hp)
      player.hp += healed
      msg(`Heal! +${healed} HP`, '#4f4')
      addEffect(player.x, player.y, '#4f4')
      break
    case 'Fireball':
      if (player.mp < 3) { msg('Not enough mana!', '#f44'); return }
      player.mp -= 3
      enemies.forEach(e => {
        if (e.hp > 0 && Math.abs(e.x - player.x) <= 3 && Math.abs(e.y - player.y) <= 3 && visible.has(e.x + ',' + e.y)) {
          e.hp -= 8
          addEffect(e.x, e.y, '#f84')
          if (e.hp <= 0) { stats.kills++; player.xp += e.xp || 0 }
        }
      })
      msg('Fireball! Flames engulf nearby foes!', '#f84')
      break
    case 'Lightning':
      if (player.mp < 4) { msg('Not enough mana!', '#f44'); return }
      player.mp -= 4
      enemies.forEach(e => {
        if (e.hp > 0 && visible.has(e.x + ',' + e.y)) {
          e.hp -= 5
          addEffect(e.x, e.y, '#8af')
          if (e.hp <= 0) { stats.kills++; player.xp += e.xp || 0 }
        }
      })
      msg('Lightning strikes all visible foes!', '#8af')
      break
    case 'Ice Shield':
      if (player.mp < 3) { msg('Not enough mana!', '#f44'); return }
      player.mp -= 3
      player.shieldTurns = 8
      player.shieldDef = 3
      msg('Ice Shield! +3 DEF for 8 turns.', '#4af')
      addEffect(player.x, player.y, '#4af')
      break
    case 'Teleport':
      if (player.mp < 2) { msg('Not enough mana!', '#f44'); return }
      player.mp -= 2
      addEffect(player.x, player.y, '#a4f')
      const dest = randomFloorTile()
      player.x = dest.x; player.y = dest.y
      addEffect(player.x, player.y, '#a4f')
      msg('Teleported!', '#a4f')
      break
    default: return
  }

  enemies = enemies.filter(e => e.hp > 0)
  enemyTurns()
  computeFOV()
  render()
}

// ===== ITEMS =====
function pickupItem(x, y) {
  const item = itemAt(x, y)
  if (!item) return

  // Special encounter
  if (item.type === 'encounter') {
    triggerEncounter(item)
    return
  }

  items = items.filter(i => i !== item)
  stats.itemsFound++

  switch (item.type) {
    case 'potion':
      player.potions++
      msg(`Picked up ${item.name}!`, '#f4a')
      break
    case 'mana':
      player.manaCrystals++
      msg(`Picked up ${item.name}!`, '#48f')
      break
    case 'gold':
      player.gold += item.value
      stats.gold += item.value
      msg(`Found ${item.value} gold!`, C.gold)
      break
    case 'weapon':
      if (item.atk > player.weapon.atk) {
        msg(`Equipped ${item.name}! (ATK +${item.atk})`, '#fa4')
        player.weapon = { name: item.name, atk: item.atk }
      } else {
        msg(`Found ${item.name} — yours is better.`, '#888')
      }
      break
    case 'armor':
      if (item.def > player.armor.def) {
        msg(`Equipped ${item.name}! (DEF +${item.def})`, '#4af')
        player.armor = { name: item.name, def: item.def }
      } else {
        msg(`Found ${item.name} — yours is better.`, '#888')
      }
      break
    case 'spellbook':
      if (!player.spells.includes(item.spell)) {
        player.spells.push(item.spell)
        msg(`Learned ${item.spell}!`, '#f4f')
        narrative.setVar('arcane_power', Math.min(10, narrative.variables.arcane_power + 2),
          `Nauczono się zaklęcia: ${item.spell}`)
      } else {
        player.mp = Math.min(player.maxMp, player.mp + 5)
        msg(`Already know ${item.spell}. +5 MP instead.`, '#a4f')
      }
      break
  }
}

// ===== SPECIAL ENCOUNTERS =====
function triggerEncounter(item) {
  items = items.filter(i => i !== item)

  if (item.encounter === 'cursed-crystal') {
    msg('A dark crystal pulses with forbidden power...', '#f4f')
    msg('[Y] Take it (+3 ATK, but cursed)  [N] Leave it', '#fd4')
    pendingChoice = {
      onYes() {
        player.weapon = { name: 'Cursed Crystal Blade', atk: player.weapon.atk + 3 }
        narrative.setVar('cursed', true, 'Wziął Przeklęty Kryształ — moc za cenę klątwy')
        narrative.transition('cursed-artifact', 'Przyjął przeklęty artefakt')
        msg('The crystal fuses with your weapon! Power surges... and darkness.', '#f4f')
      },
      onNo() {
        narrative.transition('cursed-artifact', 'Odrzucił przeklęty artefakt')
        msg('You leave the crystal. Wise, perhaps.', '#888')
      }
    }
    render()
  } else if (item.encounter === 'imprisoned-wizard') {
    msg('An old wizard trapped in a magical cage!', '#4af')
    msg('[Y] Free him (learn spell)  [N] Walk away', '#fd4')
    pendingChoice = {
      onYes() {
        narrative.variables.allies_freed++
        narrative.setVar('allies_freed', narrative.variables.allies_freed, 'Uwolniono uwięzionego maga')
        narrative.transition('imprisoned-wizard', 'Uwolnił maga')
        const available = SPELL_DEFS.filter(s => !player.spells.includes(s))
        if (available.length > 0) {
          const spell = available[rand(0, available.length - 1)]
          player.spells.push(spell)
          msg(`The wizard teaches you ${spell}! "Use it well..."`, '#4af')
          narrative.setVar('arcane_power', Math.min(10, narrative.variables.arcane_power + 2),
            `Mag nauczył zaklęcia: ${spell}`)
        } else {
          player.maxMp += 5; player.mp += 5
          msg('The wizard blesses you with +5 max MP!', '#48f')
        }
      },
      onNo() {
        narrative.transition('imprisoned-wizard', 'Zignorował uwięzionego maga')
        msg('You walk past. The wizard\'s eyes follow you sadly.', '#888')
      }
    }
    render()
  }
}

// ===== ENEMY AI =====
function enemyTurns() {
  // Shield countdown
  if (player.shieldTurns > 0) {
    player.shieldTurns--
    if (player.shieldTurns === 0) {
      msg('Ice Shield fades.', '#4af')
    }
  }

  enemies.forEach(e => {
    if (e.hp <= 0) return
    if (!visible.has(e.x + ',' + e.y)) return

    const dx = player.x - e.x
    const dy = player.y - e.y
    const dist = Math.abs(dx) + Math.abs(dy)

    if (dist <= 1) {
      doAttack(e, player, false)
    } else {
      let mx = 0, my = 0
      if (Math.abs(dx) >= Math.abs(dy)) mx = dx > 0 ? 1 : -1
      else my = dy > 0 ? 1 : -1
      const nx = e.x + mx, ny = e.y + my
      if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && map[ny][nx] !== WALL && !occupied(nx, ny)) {
        e.x = nx; e.y = ny
      }
    }
  })
  enemies = enemies.filter(e => e.hp > 0)
}

// ===== GENERATE FLOOR =====
function generateFloor() {
  floor++
  const rooms = generateMap()

  revealed = []
  for (let y = 0; y < ROWS; y++) revealed[y] = new Array(COLS).fill(false)

  // Place player
  const start = rooms[0]
  if (!player) {
    player = {
      x: start.cx, y: start.cy,
      hp: 30, maxHp: 30, mp: 10, maxMp: 10,
      atk: 3, def: 1,
      weapon: { name: 'Fists', atk: 0 },
      armor: { name: 'None', def: 0 },
      potions: 2, manaCrystals: 1,
      spells: ['Heal'],
      gold: 0, xp: 0,
      shieldTurns: 0, shieldDef: 3,
    }
  } else {
    player.x = start.cx; player.y = start.cy
  }

  // Spawn enemies
  enemies = []
  const defs = FLOOR_ENEMIES[Math.min(floor, MAX_FLOOR)]
  defs.forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      const pos = randomFloorTile()
      const d = ENEMY_DEFS[type]
      enemies.push({
        x: pos.x, y: pos.y,
        hp: d.hp + floor * 2, maxHp: d.hp + floor * 2,
        atk: d.atk + Math.floor(floor / 2), def: d.def,
        name: d.name, char: d.char, color: d.color, xp: d.xp,
      })
    }
  })

  // Spawn items
  items = []
  for (let i = 0; i < rand(1, 2); i++) {
    const p = randomFloorTile()
    items.push({ x: p.x, y: p.y, type: 'potion', name: 'Health Potion', char: '!', color: '#f4a' })
  }
  if (rand(0, 1)) {
    const p = randomFloorTile()
    items.push({ x: p.x, y: p.y, type: 'mana', name: 'Mana Crystal', char: '◆', color: '#48f' })
  }
  for (let i = 0; i < rand(2, 4); i++) {
    const p = randomFloorTile()
    items.push({ x: p.x, y: p.y, type: 'gold', name: 'Gold', char: '$', color: C.gold, value: rand(5, 15 + floor * 5) })
  }
  if (rand(0, 1)) {
    const p = randomFloorTile()
    const w = WEAPONS[Math.min(floor - 1, WEAPONS.length - 1)]
    items.push({ x: p.x, y: p.y, type: 'weapon', name: w.name, char: '/', color: '#fa4', atk: w.atk })
  }
  if (rand(0, 2) === 0) {
    const p = randomFloorTile()
    const a = ARMORS[Math.min(floor - 1, ARMORS.length - 1)]
    items.push({ x: p.x, y: p.y, type: 'armor', name: a.name, char: '[', color: '#4af', def: a.def })
  }
  // Spellbook
  const available = SPELL_DEFS.filter(s => !player.spells.includes(s))
  if (available.length > 0 && rand(0, 1)) {
    const p = randomFloorTile()
    const spell = available[rand(0, available.length - 1)]
    items.push({ x: p.x, y: p.y, type: 'spellbook', name: 'Spellbook: ' + spell, char: '♦', color: '#f4f', spell })
  }

  // Special encounters
  if (floor === 1) {
    const p = randomFloorTile()
    items.push({ x: p.x, y: p.y, type: 'encounter', encounter: 'cursed-crystal', name: 'Cursed Crystal', char: '✦', color: '#f4f' })
  }
  if (floor === 2) {
    const p = randomFloorTile()
    items.push({ x: p.x, y: p.y, type: 'encounter', encounter: 'imprisoned-wizard', name: 'Imprisoned Wizard', char: '?', color: '#4af' })
  }

  // Narrative
  narrative.transition('floor-' + floor, `Wkroczono na piętro ${floor}: ${FLOOR_NAMES[floor]}`)
  msg(`--- Floor ${floor}: ${FLOOR_NAMES[floor]} ---`, '#fd4')

  computeFOV()
  render()
}

// ===== PLAYER ACTION =====
function playerAction(dx, dy) {
  if (!gameActive || pendingChoice) return

  const nx = player.x + dx, ny = player.y + dy
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return
  if (map[ny][nx] === WALL) return

  const enemy = enemyAt(nx, ny)
  if (enemy) {
    doAttack(player, enemy, true)
    if (enemy.hp <= 0 && enemy.name === 'The Archmage') {
      narrative.setVar('boss_defeated', true, 'Arcymag pokonany!')
      narrative.transition('victory', 'Zwycięstwo! Zamek wolny od mrocznej magii!')
      msg('THE ARCHMAGE IS DEFEATED! YOU WIN!', '#fd4')
      gameActive = false
      enemies = enemies.filter(e => e.hp > 0)
      computeFOV()
      render()
      setTimeout(gameOver, 2000)
      return
    }
  } else {
    player.x = nx; player.y = ny
    pickupItem(nx, ny)
    if (pendingChoice) { computeFOV(); render(); return }
    if (map[ny][nx] === STAIRS) {
      msg('You ascend the stairs...', '#4fa')
      generateFloor()
      return
    }
  }

  enemies = enemies.filter(e => e.hp > 0)
  enemyTurns()

  if (player.hp <= 0) {
    msg('You have been slain...', '#f44')
    narrative.transition('death', `Zginął na piętrze ${floor}: ${FLOOR_NAMES[floor]}`)
    gameActive = false
    render()
    setTimeout(gameOver, 2000)
    return
  }

  computeFOV()
  render()
}

// ===== SCORE =====
function calcScore() {
  if (!player) return 0
  return (floor * 100) + (stats.kills * 10) + stats.gold + (stats.itemsFound * 25)
    + (narrative.variables.boss_defeated ? 500 : 0)
}

function gameOver() {
  ForkArcade.submitScore(calcScore())
}

// ===== USE CONSUMABLES =====
function usePotion() {
  if (player.potions <= 0) { msg('No potions!', '#f44'); return false }
  player.potions--
  const h = Math.min(20, player.maxHp - player.hp)
  player.hp += h
  msg(`Drank potion! +${h} HP`, '#f4a')
  addEffect(player.x, player.y, '#f4a')
  return true
}

function useManaCrystal() {
  if (player.manaCrystals <= 0) { msg('No mana crystals!', '#f44'); return false }
  player.manaCrystals--
  const m = Math.min(8, player.maxMp - player.mp)
  player.mp += m
  msg(`Used mana crystal! +${m} MP`, '#48f')
  addEffect(player.x, player.y, '#48f')
  return true
}

// ===== RENDER =====
function render() {
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, 800, 600)

  // --- MAP ---
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const key = x + ',' + y
      const vis = visible.has(key)
      const rev = revealed[y][x]
      if (!vis && !rev) continue

      const sx = x * T, sy = UI_Y + y * T
      const tile = map[y][x]

      if (tile === WALL) {
        ctx.fillStyle = vis ? C.wallLit : '#151020'
        ctx.fillRect(sx, sy, T, T)
        if (vis) {
          ctx.fillStyle = C.wallTop
          ctx.fillRect(sx, sy, T, 2)
        }
      } else if (tile === STAIRS) {
        ctx.fillStyle = vis ? C.stairsLit : C.stairs
        ctx.fillRect(sx, sy, T, T)
        if (vis) {
          ctx.fillStyle = '#fff'
          ctx.font = '14px monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('▲', sx + T / 2, sy + T / 2)
        }
      } else {
        ctx.fillStyle = vis ? C.floorLit : '#0d0b1a'
        ctx.fillRect(sx, sy, T, T)
        // subtle floor dots
        if (vis && (x + y) % 4 === 0) {
          ctx.fillStyle = '#2a2848'
          ctx.fillRect(sx + T / 2 - 1, sy + T / 2 - 1, 2, 2)
        }
      }

      // Dim overlay for revealed-but-not-visible
      if (!vis && rev) {
        ctx.fillStyle = 'rgba(5,5,15,0.55)'
        ctx.fillRect(sx, sy, T, T)
      }
    }
  }

  // --- ITEMS ---
  items.forEach(item => {
    if (!visible.has(item.x + ',' + item.y)) return
    ctx.fillStyle = item.color
    ctx.font = item.type === 'encounter' ? 'bold 16px monospace' : '14px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.char, item.x * T + T / 2, UI_Y + item.y * T + T / 2)
  })

  // --- ENEMIES ---
  enemies.forEach(e => {
    if (e.hp <= 0 || !visible.has(e.x + ',' + e.y)) return
    const sx = e.x * T, sy = UI_Y + e.y * T
    ctx.fillStyle = e.color
    ctx.font = 'bold 16px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(e.char, sx + T / 2, sy + T / 2)
    // HP bar
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#400'
      ctx.fillRect(sx + 2, sy, T - 4, 3)
      ctx.fillStyle = '#f44'
      ctx.fillRect(sx + 2, sy, (T - 4) * (e.hp / e.maxHp), 3)
    }
  })

  // --- PLAYER ---
  if (player) {
    const sx = player.x * T, sy = UI_Y + player.y * T
    ctx.fillStyle = C.player
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('@', sx + T / 2, sy + T / 2)
    if (player.shieldTurns > 0) {
      ctx.strokeStyle = '#4af'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(sx + T / 2, sy + T / 2, T / 2 + 2, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // --- EFFECTS ---
  effects.forEach(e => {
    const sx = e.x * T, sy = UI_Y + e.y * T
    ctx.globalAlpha = e.life / 5
    ctx.fillStyle = e.color
    ctx.fillRect(sx - 2, sy - 2, T + 4, T + 4)
    e.life--
  })
  ctx.globalAlpha = 1
  effects = effects.filter(e => e.life > 0)

  // --- UI TOP ---
  ctx.fillStyle = C.uiBg
  ctx.fillRect(0, 0, 800, UI_Y)

  if (player) {
    // HP bar
    ctx.fillStyle = '#222'
    ctx.fillRect(8, 8, 120, 12)
    ctx.fillStyle = C.hp
    ctx.fillRect(8, 8, 120 * Math.max(0, player.hp / player.maxHp), 12)
    ctx.fillStyle = '#fff'
    ctx.font = '10px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(`HP ${Math.max(0, player.hp)}/${player.maxHp}`, 12, 9)

    // MP bar
    ctx.fillStyle = '#222'
    ctx.fillRect(8, 23, 120, 10)
    ctx.fillStyle = C.mp
    ctx.fillRect(8, 23, 120 * (player.mp / player.maxMp), 10)
    ctx.fillStyle = '#fff'
    ctx.font = '9px monospace'
    ctx.fillText(`MP ${player.mp}/${player.maxMp}`, 12, 24)

    // Stats
    ctx.fillStyle = C.text
    ctx.font = '11px monospace'
    ctx.fillText(`Floor ${floor}/${MAX_FLOOR}`, 140, 9)
    ctx.fillText(`ATK ${player.atk + player.weapon.atk}  DEF ${player.def + (player.shieldTurns > 0 ? player.shieldDef : 0) + player.armor.def}`, 140, 22)

    ctx.fillStyle = C.gold
    ctx.fillText(`Gold:${player.gold}`, 290, 9)
    ctx.fillStyle = '#f4a'
    ctx.fillText(`Pot:${player.potions}`, 290, 22)
    ctx.fillStyle = '#48f'
    ctx.fillText(`Mana:${player.manaCrystals}`, 360, 22)

    // Spells
    ctx.fillStyle = '#a8a'
    ctx.font = '10px monospace'
    player.spells.forEach((s, i) => {
      ctx.fillStyle = player.mp >= spellCost(s) ? '#dad' : '#646'
      ctx.fillText(`${i + 1}:${s}`, 440 + i * 85, 22)
    })

    // Score
    ctx.fillStyle = '#fff'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`Score: ${calcScore()}`, 792, 9)
    ctx.fillText(`Kills: ${stats.kills}`, 792, 22)
    ctx.textAlign = 'left'
  }

  // --- MESSAGES ---
  ctx.fillStyle = 'rgba(10,10,26,0.88)'
  ctx.fillRect(0, MSG_Y, 800, 42)
  const shown = messages.slice(0, 3)
  shown.forEach((m, i) => {
    ctx.globalAlpha = 1 - i * 0.3
    ctx.fillStyle = m.color
    ctx.font = '11px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(m.text, 8, MSG_Y + 4 + i * 13)
  })
  ctx.globalAlpha = 1

  // --- CHOICE PROMPT ---
  if (pendingChoice) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.fillRect(0, MSG_Y - 20, 800, 20)
    ctx.fillStyle = '#fd4'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Press [Y] to accept or [N] to decline', 400, MSG_Y - 8)
  }

  // --- GAME OVER / VICTORY OVERLAY ---
  if (!gameActive && player) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.fillRect(0, 0, 800, 600)
    if (narrative.variables.boss_defeated) {
      ctx.fillStyle = '#fd4'
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('VICTORY!', 400, 250)
      ctx.fillStyle = '#ccc'
      ctx.font = '16px monospace'
      ctx.fillText('The castle is free from dark magic.', 400, 295)
    } else {
      ctx.fillStyle = '#f44'
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('YOU DIED', 400, 250)
      ctx.fillStyle = '#ccc'
      ctx.font = '16px monospace'
      ctx.fillText(`Fell on floor ${floor}: ${FLOOR_NAMES[floor]}`, 400, 295)
    }
    ctx.fillStyle = '#aaa'
    ctx.font = '18px monospace'
    ctx.fillText(`Score: ${calcScore()}  |  Kills: ${stats.kills}  |  Gold: ${player.gold}`, 400, 335)
    ctx.fillStyle = '#666'
    ctx.font = '14px monospace'
    ctx.fillText('Press [R] to restart', 400, 375)
  }
}

function spellCost(name) {
  switch (name) {
    case 'Heal': return 2
    case 'Fireball': return 3
    case 'Lightning': return 4
    case 'Ice Shield': return 3
    case 'Teleport': return 2
    default: return 99
  }
}

// ===== INPUT =====
document.addEventListener('keydown', (e) => {
  if (!player) return

  // Restart
  if ((e.key === 'r' || e.key === 'R') && !gameActive) {
    startGame()
    return
  }

  // Choice handling
  if (pendingChoice) {
    if (e.key === 'y' || e.key === 'Y') {
      const choice = pendingChoice
      pendingChoice = null
      choice.onYes()
      enemyTurns()
      computeFOV()
      render()
    } else if (e.key === 'n' || e.key === 'N') {
      const choice = pendingChoice
      pendingChoice = null
      choice.onNo()
      enemyTurns()
      computeFOV()
      render()
    }
    return
  }

  if (!gameActive) return

  // Movement
  const dirs = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  }
  if (dirs[e.key]) {
    e.preventDefault()
    playerAction(...dirs[e.key])
    return
  }

  // Potions
  if (e.key === 'q' || e.key === 'Q') {
    if (usePotion()) { enemyTurns(); computeFOV(); render() }
    return
  }
  // Mana crystal
  if (e.key === 'e' || e.key === 'E') {
    if (useManaCrystal()) { enemyTurns(); computeFOV(); render() }
    return
  }

  // Spells
  if (e.key >= '1' && e.key <= '5') {
    castSpell(parseInt(e.key) - 1)
    return
  }

  // Wait
  if (e.key === ' ' || e.key === '.') {
    e.preventDefault()
    enemyTurns()
    if (player.hp <= 0) {
      msg('You have been slain...', '#f44')
      narrative.transition('death', `Zginął na piętrze ${floor}`)
      gameActive = false
      render()
      setTimeout(gameOver, 2000)
      return
    }
    computeFOV()
    render()
  }
})

// ===== START GAME =====
function startGame() {
  floor = 0
  player = null
  enemies = []
  items = []
  messages = []
  stats = { kills: 0, gold: 0, itemsFound: 0 }
  effects = []
  pendingChoice = null
  gameActive = true

  narrative.variables = { arcane_power: 0, allies_freed: 0, cursed: false, boss_defeated: false }
  narrative.currentNode = 'castle-gate'

  msg('Welcome to the Castle of Arcana!', '#fd4')
  msg('Arrows/WASD: move | Q: potion | E: mana | 1-5: spells', '#888')
  msg('Bump into enemies to attack. Find the Archmage!', '#888')

  generateFloor()
}

// ===== SDK =====
ForkArcade.onReady(function (context) {
  console.log('Castle of Arcana ready:', context.slug)
  narrative.transition('castle-gate', 'Przybył do opuszczonego zamku')
  startGame()
})
