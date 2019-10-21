const TITLE = "AtGraph"
const HISTORY_STATE = null
const INITIAL_SRC = `N M
1 2
2 3
3 1
`

const base64Encode = data => window.btoa(data)

const base64Decode = encodedString => window.atob(encodedString)

// Source -> Edges
const parse = src => (
  src.split(/\r\n|\n/)
    .map(line => line.trim().split(/[\t 　]+/))
    .filter(items => items.length >= 2)
    .slice(1)
)

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

const renderGraph = edges => {
  const g = new dagreD3.graphlib.Graph()
    .setGraph({})
    .setDefaultEdgeLabel(() => ({}))

  for (const v of toVertices(edges)) {
    g.setNode(v, { label: v, shape: "circle" })
  }

  for (const [u, v, w] of edges) {
    g.setEdge(u, v, { label: w })
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

const update = src => {
  const edges = parse(src)
  renderGraph(edges)
  updateHash(edges)
}

const main = () => {
  const editInputElement = document.getElementById("edit-input")

  const currentSrc = () => editInputElement.value

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
    editInputElement.value = src
    update(src)
  }

  let tick = 0
  window.addEventListener("resize", () => {
    const theTick = ++tick

    setTimeout(() => {
      if (tick === theTick) { // debounce
        window.requestAnimationFrame(() => {
          update(currentSrc())
        })
      }
    }, 160)
  })

  editInputElement.addEventListener("input", ev => {
    const src = ev.target.value
    update(src)
  })

  initialize()
}

document.addEventListener("DOMContentLoaded", () => main())
