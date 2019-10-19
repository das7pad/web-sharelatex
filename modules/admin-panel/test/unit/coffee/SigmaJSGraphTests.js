/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const sinon = require('sinon');
const chai = require('chai');
const should = chai.should();
const {
    expect
} = chai;
const modulePath = "../../../app/js/SigmaJSGraph.js";
const SandboxedModule = require('sandboxed-module');
const events = require("events");
const {
    ObjectId
} = require("mongojs");
const assert = require("assert");
const Path = require("path");

describe("SigmaJSGraph", function() {

	beforeEach(function() {

		return this.SigmaJSGraph = SandboxedModule.require(modulePath, {requires: []});});

	describe("addNode", function() {

		beforeEach(function() {

			this.SigmaJSGraph.new();
			return this.SigmaJSGraph.addNode('ref', 'label', 'color');
		});

		it("should add a new node", function(done){ 
			assert.equal(this.SigmaJSGraph.nodes.length, 1);
			return done();
		});

		it("should add a node with label", function(done){ 
			assert.equal(this.SigmaJSGraph.nodes[0].label, 'label');
			return done();
		});

		it("should add a node with color", function(done){ 
			assert.equal(this.SigmaJSGraph.nodes[0].color, 'color');
			return done();
		});

		return it("shouldn't add a existing node", function(done){ 
			this.SigmaJSGraph.addNode('ref', 'label', 'color');
			assert.equal(this.SigmaJSGraph.nodes.length, 1);
			return done();
		});
	});

	return describe("addEdge", function() {

		beforeEach(function() {

			this.nodeS = ObjectId().toString();
			this.nodeT = ObjectId().toString();
			this.projectId = ObjectId().toString();

			this.SigmaJSGraph.new();
			return this.SigmaJSGraph.addEdge(this.nodeS, this.nodeT, this.projectId);
		});

		it("should add a new edge", function(done){ 
			assert.equal(this.SigmaJSGraph.edges.length, 1);
			return done();
		});

		it("should add a edge with source", function(done){ 
			assert.equal(this.SigmaJSGraph.edges[0].source, this.nodeS);
			return done();
		});

		it("should add a edge with target", function(done){ 
			assert.equal(this.SigmaJSGraph.edges[0].target, this.nodeT);
			return done();
		});

		return it("shouldn't add a existing edge", function(done){ 
			this.SigmaJSGraph.addEdge(this.nodeS, this.nodeT, this.projectId);
			this.SigmaJSGraph.addEdge(this.nodeT, this.nodeS, this.projectId);
			assert.equal(this.SigmaJSGraph.edges.length, 1);
			return done();
		});
	});
});