/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-path-concat,
    no-return-assign,
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
const sinon = require('sinon')
const chai = require('chai')
const should = chai.should()
const { expect } = chai
const modulePath = '../../../app/src/GraphController.js'
const SandboxedModule = require('sandboxed-module')
const events = require('events')
const { ObjectId } = require('mongojs')
const assert = require('assert')
const Path = require('path')

describe('GraphController', function () {
  beforeEach(function () {
    this.UserGetter = { getUser: sinon.stub() }

    this.SigmaJSGraph = {
      nodes: [],
      edges: [],
      addNode: sinon.stub(),
      addEdge: sinon.stub(),
      new: sinon.stub()
    }

    this.GraphController = SandboxedModule.require(modulePath, {
      requires: {
        'logger-sharelatex': {
          log() {},
          err() {}
        },
        '../../../../app/src/Features/User/UserGetter': this.UserGetter,
        '../../../../app/src/infrastructure/mongojs': {
          db: (this.db = {
            projects: {},
            users: {}
          }),
          ObjectId
        },
        './SigmaJSGraph': this.SigmaJSGraph
      }
    })

    this.users = [
      { _id: ObjectId(), first_name: 'James' },
      { _id: ObjectId(), first_name: 'Henry' },
      { _id: ObjectId(), first_name: 'Teddy' },
      { _id: ObjectId(), first_name: 'Harry' }
    ]

    this.projects = [
      {
        _id: 1,
        owner_ref: this.users[0]._id,
        readOnly_refs: [],
        collaberator_refs: []
      },
      {
        _id: 2,
        owner_ref: this.users[0]._id,
        readOnly_refs: this.users[2]._id,
        collaberator_refs: this.users[3]._id
      },
      {
        _id: 3,
        owner_ref: this.users[0]._id,
        readOnly_refs: this.users[1]._id,
        collaberator_refs: []
      },
      {
        _id: 4,
        owner_ref: this.users[1]._id,
        readOnly_refs: this.users[0]._id,
        collaberator_refs: []
      }
    ]

    this.db.projects.find = sinon.stub().callsArgWith(2, null, this.projects)
    this.db.users.find = sinon.stub().callsArgWith(2, null, this.users)
    this.UserGetter.getUser = (user_id, fields, callback) => {
      return callback(null, this.users[0])
    }

    this.emptyGraph = {
      nodes: [],
      edges: []
    }

    this.nodes = [
      { id: this.users[0]._id.toString(), label: '' },
      { id: this.users[1]._id.toString(), label: '' },
      { id: this.users[2]._id.toString(), label: '' }
    ]

    this.req = {
      params: {
        user_id: 'user_id_here'
      },
      query: {
        SecondLevel: false
      }
    }

    this.res = {}

    return (this.callback = sinon.stub())
  })

  describe('userGraph', function () {
    beforeEach(function () {
      return (this.GraphController._nextLevel = sinon
        .stub()
        .callsArgWith(3, null, this.SigmaJSGraph))
    })

    it('should render the graph page', function (done) {
      this.res.render = (pageName, opts) => {
        pageName.should.equal(
          Path.resolve(__dirname + '/../../../') + '/app/views/user/graph'
        )
        return done()
      }
      return this.GraphController.userGraph(this.req, this.res)
    })

    it('should send the user', function (done) {
      this.res.render = (pageName, opts) => {
        opts.user.should.deep.equal(this.users[0])
        return done()
      }
      return this.GraphController.userGraph(this.req, this.res)
    })

    return it('should send the user graph', function (done) {
      this.res.render = (pageName, opts) => {
        opts.graph.should.deep.equal(this.SigmaJSGraph)
        return done()
      }
      return this.GraphController.userGraph(this.req, this.res)
    })
  })

  describe('_genGraph', function () {
    beforeEach(function () {})

    it('should create graph with nodes', function (done) {
      return this.GraphController._genGraph(
        this.projects,
        [this.users[0]._id.toString()],
        this.SigmaJSGraph,
        (err, graph) => {
          graph.nodes.should.exist
          return done()
        }
      )
    })

    return it('should create graph with edges', function (done) {
      return this.GraphController._genGraph(
        this.projects,
        [this.users[0]._id.toString()],
        this.SigmaJSGraph,
        (err, graph) => {
          graph.edges.should.exist
          return done()
        }
      )
    })
  })

  describe('_nextLevel', function () {
    beforeEach(function () {
      this.OneLevelGraph = {
        nodes: this.nodes,
        edges: [1, 2, 3, 4]
      }

      this.GraphController._genGraph = sinon
        .stub()
        .callsArgWith(3, null, this.OneLevelGraph)
      return (this.GraphController._getNames = sinon
        .stub()
        .callsArgWith(1, null, this.OneLevelGraph))
    })

    return it('should create 1-level graph', function (done) {
      return this.GraphController._nextLevel(
        [this.users[0]._id.toString()],
        this.emptyGraph,
        1,
        (err, graph) => {
          assert.equal(graph.nodes.length, 3)
          return done()
        }
      )
    })
  })

  return describe('_getNames', function () {
    return it('should add name to nodes', function (done) {
      return this.GraphController._getNames(
        { nodes: this.nodes, edges: [] },
        (err, graph) => {
          for (const node of Array.from(graph.nodes)) {
            node.label.should.not.equal('')
          }
          return done()
        }
      )
    })
  })
})
