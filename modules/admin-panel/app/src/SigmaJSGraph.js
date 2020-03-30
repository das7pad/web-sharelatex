/* eslint-disable
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let SigmaJSGraph
module.exports = SigmaJSGraph = {
  nodes: [],
  edges: [],

  new() {
    this.nodes = []
    this.edges = []
    return this
  },

  addNode(ref, label, color) {
    // avoid duplicate nodes
    let exists = false
    for (const node of Array.from(this.nodes)) {
      if (node.id === ref.toString()) {
        exists = true
        break
      }
    }

    if (!exists) {
      return this.nodes.push({
        id: ref.toString(),
        label,
        x: this.nodes.length,
        y: Math.floor(Math.random() * 10 + 1),
        size: 2,
        color
      })
    }
  },

  addEdge(nodeS, nodeT, project) {
    // create a hash to compare
    let hash
    if (nodeS > nodeT) {
      hash = nodeS + nodeT + project._id
    } else {
      hash = nodeT + nodeS + project._id
    }

    // avoid duplicate edges
    let exists = false
    for (const edge of Array.from(this.edges)) {
      if (edge.hash === hash) {
        exists = true
        break
      }
    }

    if (!exists) {
      return this.edges.push({
        id: Math.random().toString(),
        label: project.name,
        source: nodeS,
        target: nodeT,
        type: 'curve',
        count: Math.floor(Math.random() * 10 + 1),
        size: 2,
        projectId: project._id,
        hash
      })
    }
  }
}
