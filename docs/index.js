const TITLE = "AtGraph"
const HISTORY_STATE = null
const INITIAL_SRC = `N M
1 2
2 3
3 1
`
const CHAR_LF = 0x0a
const UPDATE_FRAME = 16

const base64Encode = data => window.btoa(data)

const base64Decode = encodedString => window.atob(encodedString)

const keyCodeIsArrow = k => 37 <= k && k <= 40

const textIndexToPosition = (text, index) => {
  index = Math.max(0, Math.min(text.length, index))

  let row = 0
  let col = 0
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === CHAR_LF) {
      row++
      col = 0
    } else {
      col++
    }
  }

  return [row, col]
}

// The end line is inclusive.
const textSelectionToLineRange = (text, [start, end]) => {
  const [startLine] = textIndexToPosition(text, start)
  const [endLine] = textIndexToPosition(text, Math.max(start, end - 1))
  return [startLine, endLine]
}

// Source -> EdgesWithLineIndexes
const parseWithLineIndexes = src => (
  src.split(/\r\n|\n/)
    .map((line, lineIndex) => [lineIndex, line.trim().split(/[\t 　]+/)])
    .filter(([, items]) => items.length >= 2)
    .slice(1)
)

// EdgesWithLineIndexes -> Edges
const stripLineIndexes = edges =>
  edges.map(([, items]) => items)

// Source -> Edges
const parse = src => stripLineIndexes(parseWithLineIndexes(src))

// Edges -> Source
const format = edges =>
  "N M\n" + edges.map(items => items.join(" ") + "\n").join("")

// Edges -> SerializedEdges
const serialize = edges => {
  if (isEmpty(edges)) {
    return ""
  }

  return base64Encode(format(edges))
}

// SerializedEdges | null => Edges | null
const deserialize = serializedEdges => {
  if (!serializedEdges) {
    return null
  }

  try {
    return parse(base64Decode(serializedEdges))
  } catch {
    return null
  }
}

const isEmpty = edges =>
  edges.length === 0

const toVertices = edges => {
  const rev = {}
  const vertices = []

  const addVertex = v => {
    if (rev[v] === undefined) {
      const index = vertices.length
      vertices.push(v)
      rev[v] = index
    }
  }

  for (const [u, v] of edges) {
    addVertex(u)
    addVertex(v)
  }

  return vertices
}

let svgGroup = undefined

const renderGraph = ({ vertices, edges }) => {
  const g = new dagreD3.graphlib.Graph()
    .setGraph({})
    .setDefaultEdgeLabel(() => ({}))

  for (const v of vertices) {
    g.setNode(v, { label: v, shape: "circle" })
  }

  for (const { u, v, w, active } of edges) {
    const klass = active ? "active" : "inactive"
    g.setEdge(u, v, { label: w, class: klass })
  }

  const render = new dagreD3.render()

  const svg = d3.select("#preview-figure")

  if (!svgGroup) {
    svgGroup = svg.append("g")
  }

  render(d3.select("svg g"), g)

  if (!isEmpty(edges)) {
    const width = Math.max(100, window.innerWidth - 100)
    svg.attr("width", width)

    const offsetX = (width - g.graph().width) / 2
    svgGroup.attr("transform", `translate(${offsetX}, 20)`)
    svg.attr("height", g.graph().height + 40)
  }
}

const updateHash = edges => {
  const hash = "#" + serialize(edges)
  window.history.replaceState(HISTORY_STATE, TITLE, hash)
}

const update = (src, selection) => {
  // Parse text.
  const edgesWithLineIndexes = parseWithLineIndexes(src, selection)
  const edges = stripLineIndexes(edgesWithLineIndexes)

  // Highlight edges.
  const [lineStart, lineEnd] = textSelectionToLineRange(src, selection)
  const isActiveEdge = i => {
    const [lineIndex] = edgesWithLineIndexes[i]
    return lineStart <= lineIndex && lineIndex <= lineEnd
  }

  // Create graph.
  const rendarableVertices = toVertices(edges)
  const renderableEdges = edges.map(([u, v, w], ei) => ({
    u, v, w, active: isActiveEdge(ei),
  }))

  // console.log({ src, selection, lineStart, lineEnd, edgesWithLineIndexes })

  renderGraph({ vertices: rendarableVertices, edges: renderableEdges })
  updateHash(edges)
}

const main = () => {
  const editInputElement = document.getElementById("edit-input")

  const currentSrc = () => editInputElement.value

  const currentSelection = () => [
    editInputElement.selectionStart,
    editInputElement.selectionEnd,
  ]

  const initialSrc = () => {
    const hash = document.location.hash.replace(/^#/, "")
    const edges = deserialize(hash)
    if (!edges) {
      return INITIAL_SRC
    }

    return format(edges)
  }

  const initialize = () => {
    const src = initialSrc()
    const currentSelection = [0, 0]

    editInputElement.value = src
    update(src, currentSelection)
  }

  const updateWithCurrent = () => {
    update(currentSrc(), currentSelection())
  }

  let tick = 0
  const delayUpdate = () => {
    const theTick = ++tick

    setTimeout(() => {
      if (tick === theTick) { // debounce
        window.requestAnimationFrame(() => {
          updateWithCurrent()
        })
      }
    }, UPDATE_FRAME)
  }

  window.addEventListener("resize", () => {
    delayUpdate()
  })

  editInputElement.addEventListener("input", ev => {
    const src = ev.target.value
    const selection = currentSelection()
    update(src, selection)
  })

  editInputElement.addEventListener("keydown", ev => {
    if (keyCodeIsArrow(ev.keyCode)) {
      delayUpdate()
    }
  })

  editInputElement.addEventListener("click", () => {
    delayUpdate()
  })

  initialize()
}

document.addEventListener("DOMContentLoaded", () => main())
