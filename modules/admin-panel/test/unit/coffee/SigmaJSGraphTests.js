sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/SigmaJSGraph.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "SigmaJSGraph", ->

	beforeEach ->

		@SigmaJSGraph = SandboxedModule.require modulePath, requires: []

	describe "addNode", ->

		beforeEach ->

			@SigmaJSGraph.new()
			@SigmaJSGraph.addNode 'ref', 'label', 'color'

		it "should add a new node", (done)-> 
			assert.equal @SigmaJSGraph.nodes.length, 1
			done()

		it "should add a node with label", (done)-> 
			assert.equal @SigmaJSGraph.nodes[0].label, 'label'
			done()

		it "should add a node with color", (done)-> 
			assert.equal @SigmaJSGraph.nodes[0].color, 'color'
			done()

		it "shouldn't add a existing node", (done)-> 
			@SigmaJSGraph.addNode 'ref', 'label', 'color'
			assert.equal @SigmaJSGraph.nodes.length, 1
			done()

	describe "addEdge", ->

		beforeEach ->

			@nodeS = ObjectId().toString()
			@nodeT = ObjectId().toString()
			@projectId = ObjectId().toString()

			@SigmaJSGraph.new()
			@SigmaJSGraph.addEdge @nodeS, @nodeT, @projectId

		it "should add a new edge", (done)-> 
			assert.equal @SigmaJSGraph.edges.length, 1
			done()

		it "should add a edge with source", (done)-> 
			assert.equal @SigmaJSGraph.edges[0].source, @nodeS
			done()

		it "should add a edge with target", (done)-> 
			assert.equal @SigmaJSGraph.edges[0].target, @nodeT
			done()

		it "shouldn't add a existing edge", (done)-> 
			@SigmaJSGraph.addEdge @nodeS, @nodeT, @projectId
			@SigmaJSGraph.addEdge @nodeT, @nodeS, @projectId
			assert.equal @SigmaJSGraph.edges.length, 1
			done()