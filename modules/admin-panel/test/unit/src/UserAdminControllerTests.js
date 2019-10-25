/* eslint-disable
    camelcase,
    max-len,
    no-path-concat,
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const sinon = require('sinon')
const chai = require('chai')
const should = chai.should()
const { expect } = chai
const modulePath = '../../../app/src/UserAdminController.js'
const SandboxedModule = require('sandboxed-module')
const events = require('events')
const { ObjectId } = require('mongojs')
const assert = require('assert')
const Path = require('path')
const MockResponse = require('../../../../../test/unit/src/helpers/MockResponse')

describe('UserAdminController', function() {
  beforeEach(function() {
    let User, user_count, users
    this.user = { user_id: 1, first_name: 'James' }
    this.users = users = [{ first_name: 'James' }, { first_name: 'Henry' }]
    this.projects = {
      owned: [
        { lastUpdated: 1, _id: 1, owner_ref: 'user-1' },
        { lastUpdated: 2, _id: 2, owner_ref: 'user-2' }
      ],
      readAndWrite: [],
      readOnly: []
    }
    this.user_count = user_count = 35043

    this.UserGetter = { getUser: sinon.stub() }

    this.UserDeleter = { deleteUser: sinon.stub().callsArgWith(1) }

    this.UserUpdater = { changeEmailAddress: sinon.stub() }

    this.User = User = (function() {
      User = class User {
        static initClass() {
          this.update = sinon.stub().yields()
          this.find = sinon.stub().yields(null, users)
          this.count = sinon.stub().yields(null, user_count)
        }
      }
      User.initClass()
      return User
    })()

    this.AuthenticationManager = { setUserPassword: sinon.stub() }

    this.AuthenticationController = {}

    this.adminSubscription = { _id: 'mock-subscription-id-1' }
    this.memberSubscriptions = [
      { _id: 'mock-subscription-id-2' },
      { _id: 'mock-subscription-id-3' }
    ]
    this.managedSubscription = { _id: 'mock-subscription-id-4' }
    this.SubscriptionLocator = {
      getUsersSubscription: sinon.stub().yields(null, this.adminSubscription),
      getMemberSubscriptions: sinon
        .stub()
        .yields(null, this.memberSubscriptions),
      findManagedSubscription: sinon
        .stub()
        .yields(null, this.managedSubscription)
    }

    this.ProjectGetter = {
      findAllUsersProjects: sinon.stub().yields(null, this.projects)
    }

    this.UserAdminController = SandboxedModule.require(modulePath, {
      requires: {
        'logger-sharelatex': {
          log() {},
          err() {}
        },
        '../../../../app/src/Features/User/UserGetter': this.UserGetter,
        '../../../../app/src/Features/User/UserDeleter': this.UserDeleter,
        '../../../../app/src/Features/User/UserUpdater': this.UserUpdater,
        '../../../../app/src/Features/Authentication/AuthenticationManager': this
          .AuthenticationManager,
        '../../../../app/src/Features/Authentication/AuthenticationController': this
          .AuthenticationController,
        '../../../../app/src/Features/Subscription/SubscriptionLocator': this
          .SubscriptionLocator,
        '../../../../app/src/models/User': { User: this.User },
        '../../../../app/src/Features/Project/ProjectGetter': this
          .ProjectGetter,
        '../../../../app/src/Features/Subscription/FeaturesUpdater': (this.FeaturesUpdater = {}),
        'metrics-sharelatex': {
          gauge() {}
        },
        'settings-sharelatex': (this.settings = {})
      }
    })

    this.perPage = this.UserAdminController.PER_PAGE

    this.UserGetter.getUser = (user_id, fields, callback) => {
      return callback(null, this.user)
    }

    this.req = {
      body: {
        query: ''
      }
    }

    this.res = new MockResponse()
    this.res.locals = {
      jsPath: 'js path here'
    }
  })

  describe('index', function() {
    it('should render the admin/index page', function(done) {
      this.res.render = (pageName, opts) => {
        pageName.should.equal(
          Path.resolve(__dirname + '/../../../') + '/app/views/user/index'
        )
        return done()
      }
      return this.UserAdminController.index(this.req, this.res)
    })

    it('should send the users', function(done) {
      this.res.render = (pageName, opts) => {
        opts.users.should.deep.equal(this.users)
        return done()
      }
      return this.UserAdminController.index(this.req, this.res)
    })

    return it('should send the pages', function(done) {
      this.res.render = (pageName, opts) => {
        opts.pages.should.equal(Math.ceil(this.user_count / this.perPage))
        return done()
      }
      return this.UserAdminController.index(this.req, this.res)
    })
  })

  describe('search', function() {
    beforeEach(function() {
      return (this.req = {
        body: {
          query: '',
          page: 1
        }
      })
    })

    it('should send the users', function(done) {
      this.res.callback = () => {
        this.res.statusCode.should.equal(200)
        JSON.parse(this.res.body).users.should.deep.equal(this.users)
        return done()
      }
      return this.UserAdminController.search(this.req, this.res)
    })

    return it('should send the pages', function(done) {
      this.res.callback = () => {
        this.res.statusCode.should.equal(200)
        JSON.parse(this.res.body).pages.should.equal(
          Math.ceil(this.user_count / this.perPage)
        )
        return done()
      }
      return this.UserAdminController.search(this.req, this.res)
    })
  })

  describe('show', function() {
    beforeEach(function() {
      this.UserAdminController._isSuperAdmin = sinon
        .stub()
        .withArgs(this.req)
        .returns(false)
      return (this.req = {
        params: {
          user_id: 'user_id_here'
        }
      })
    })

    it('should render the admin/userInfo page', function(done) {
      this.res.render = (pageName, opts) => {
        pageName.should.equal(
          Path.resolve(__dirname + '/../../../') + '/app/views/user/show'
        )
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    it('should send the user', function(done) {
      this.res.render = (pageName, opts) => {
        opts.user.should.deep.equal(this.user)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    it('should send the user projects', function(done) {
      this.res.render = (pageName, opts) => {
        opts.projects.should.deep.equal(this.projects.owned)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    it("should send the user's subscription", function(done) {
      this.res.render = (pageName, opts) => {
        opts.adminSubscription.should.deep.equal(this.adminSubscription)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    it("should send the user's member subscriptions", function(done) {
      this.res.render = (pageName, opts) => {
        opts.memberSubscriptions.should.deep.equal(this.memberSubscriptions)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    it("should send the user's managed subscription", function(done) {
      this.res.render = (pageName, opts) => {
        opts.managedSubscription.should.deep.equal(this.managedSubscription)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    it('should set the super admin state', function(done) {
      this.res.render = (pageName, opts) => {
        expect(opts.isSuperAdmin).to.equal(false)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })

    return it('should set the super admin state to true when super admin', function(done) {
      this.UserAdminController._isSuperAdmin = sinon
        .stub()
        .withArgs(this.req)
        .returns(true)
      this.res.render = (pageName, opts) => {
        expect(opts.isSuperAdmin).to.equal(true)
        return done()
      }
      return this.UserAdminController.show(this.req, this.res)
    })
  })

  describe('delete', function() {
    return it('should delete the user', function(done) {
      this.req = {
        params: {
          user_id: 'user_id_here'
        }
      }
      this.res.sendStatus = code => {
        this.UserDeleter.deleteUser
          .calledWith('user_id_here')
          .should.equal(true)
        code.should.equal(200)
        return done()
      }
      return this.UserAdminController.delete(this.req, this.res)
    })
  })

  describe('update', function() {
    beforeEach(function() {
      this.UserAdminController._isSuperAdmin = sinon
        .stub()
        .withArgs(this.req)
        .returns(false)
      this.req.params = { user_id: (this.user_id = ObjectId().toString()) }
      return (this.res.sendStatus = sinon.stub())
    })

    describe('successfully', function() {
      beforeEach(function() {
        this.req.body = { first_name: 'James' }
        return this.UserAdminController.update(this.req, this.res)
      })

      return it('should call User.update with the updated attributes', function() {
        this.User.update.calledWith({ _id: this.user_id }).should.equal(true)
        const updateQuery = this.User.update.args[0][1]
        return updateQuery.$set.first_name.should.equal('James')
      })
    })

    describe('with unknown attribute', function() {
      beforeEach(function() {
        this.req.body = { foo_bar: 100 }
        return this.UserAdminController.update(this.req, this.res)
      })

      return it('should ignore the attribute', function() {
        this.User.update.calledWith({ _id: this.user_id }).should.equal(true)
        const updateQuery = this.User.update.args[0][1]
        return expect(updateQuery.$set.foo_bar).to.equal(undefined)
      })
    })

    describe("with boolean attribute set to 'on'", function() {
      beforeEach(function() {
        this.req.body = { 'features.versioning': 'on' }
        return this.UserAdminController.update(this.req, this.res)
      })

      return it('should set the attribute to true', function() {
        const updateQuery = this.User.update.args[0][1]
        return expect(updateQuery.$set['features.versioning']).to.equal(true)
      })
    })

    describe('with missing boolean attribute', function() {
      beforeEach(function() {
        this.req.body = {}
        return this.UserAdminController.update(this.req, this.res)
      })

      return it('should set the attribute to false', function() {
        const updateQuery = this.User.update.args[0][1]
        return expect(updateQuery.$set['features.versioning']).to.equal(false)
      })
    })

    describe('with super admin only attribute', function() {
      beforeEach(function() {
        this.req.body = { isAdmin: true }
        return this.UserAdminController.update(this.req, this.res)
      })

      return it('should ignore the attribute', function() {
        const updateQuery = this.User.update.args[0][1]
        return expect(updateQuery.$set.isAdmin).to.equal(undefined)
      })
    })

    return describe('with super admin only attribute when a super admin', function() {
      beforeEach(function() {
        this.UserAdminController._isSuperAdmin = sinon
          .stub()
          .withArgs(this.req)
          .returns(true)
        this.req.body = { isAdmin: true }
        return this.UserAdminController.update(this.req, this.res)
      })

      return it('should ignore the attribute', function() {
        const updateQuery = this.User.update.args[0][1]
        return expect(updateQuery.$set.isAdmin).to.equal(true)
      })
    })
  })

  describe('updateEmail', function() {
    beforeEach(function() {
      this.req.params = { user_id: (this.user_id = ObjectId().toString()) }
      return (this.req.body = { email: (this.email = 'jane@example.com') })
    })

    describe('successfully', function() {
      beforeEach(function() {
        this.UserUpdater.changeEmailAddress.yields(null)
        return this.UserAdminController.updateEmail(this.req, this.res)
      })

      it('should update the email', function() {
        return this.UserUpdater.changeEmailAddress
          .calledWith(this.user_id, this.email)
          .should.equal(true)
      })

      return it('should return 204', function() {
        return this.res.statusCode.should.equal(204)
      })
    })

    return describe('with existing email', function() {
      beforeEach(function() {
        this.UserUpdater.changeEmailAddress.yields({ message: 'alread_exists' })
        this.UserAdminController.updateEmail(this.req, this.res)
      })

      return it('should return 400 with a message', function() {
        this.res.statusCode.should.equal(400)
        this.res.body.should.equal(
          JSON.stringify({ message: 'Email is in use by another user' })
        )
      })
    })
  })

  return describe('_isSuperAdmin', function() {
    beforeEach(function() {
      this.current_user_id = 'current_user_id-123'
      return (this.AuthenticationController.getLoggedInUserId = sinon
        .stub()
        .withArgs(this.req)
        .returns(this.current_user_id))
    })

    it('should return false if no super admin setting is set', function() {
      delete this.settings.superAdminUserIds
      return expect(this.UserAdminController._isSuperAdmin(this.req)).to.equal(
        false
      )
    })

    it('should return false if user is not in super admins', function() {
      this.settings.superAdminUserIds = ['not-current-user']
      return expect(this.UserAdminController._isSuperAdmin(this.req)).to.equal(
        false
      )
    })

    return it('should return true if user is in super admins', function() {
      this.settings.superAdminUserIds = [this.current_user_id]
      return expect(this.UserAdminController._isSuperAdmin(this.req)).to.equal(
        true
      )
    })
  })
})
