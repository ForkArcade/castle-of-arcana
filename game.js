const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')

// Game state
let score = 0

// --- Narrative engine ---
const narrative = {
  variables: { corruption: 0, npcs_saved: 0, cursed: false },
  currentNode: 'surface',
  graph: {
    nodes: [
      { id: 'surface', label: 'Surface', type: 'scene' },
      { id: 'dungeon-1', label: 'Shallow Dungeon', type: 'scene' },
      { id: 'npc-encounter', label: 'Trapped NPC', type: 'choice' },
      { id: 'deep-dungeon', label: 'The Depths', type: 'scene' },
    ],
    edges: [
      { from: 'surface', to: 'dungeon-1' },
      { from: 'dungeon-1', to: 'npc-encounter' },
      { from: 'npc-encounter', to: 'deep-dungeon', label: 'Save' },
    ]
  },

  transition(nodeId, event) {
    this.currentNode = nodeId
    ForkArcade.updateNarrative({
      variables: this.variables,
      currentNode: this.currentNode,
      graph: this.graph,
      event: event
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

// Initialize when SDK connects to platform
ForkArcade.onReady(function(context) {
  console.log('Roguelike ready:', context.slug)
  narrative.transition('surface', 'Entered the world')
  start()
})

function start() {
  // TODO: implement your roguelike here
  // Use narrative.transition(nodeId, event) to advance the story
  // Use narrative.setVar(name, value, reason) to change variables
  render()
}

function render() {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = '#0f0'
  ctx.font = '24px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('Roguelike — implement game.js', canvas.width / 2, canvas.height / 2)
}

function gameOver() {
  ForkArcade.submitScore(score)
}
