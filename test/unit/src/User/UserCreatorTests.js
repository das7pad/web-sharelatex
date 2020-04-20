const SandboxedModule = require('sandboxed-module')
const chai = require('chai')
const sinon = require('sinon')

const assert = chai.assert
const modulePath = '../../../../app/src/Features/User/UserCreator.js'

describe('UserCreator', function () {
  beforeEach(function () {
    const self = this
    this.user = { _id: '12390i', ace: {} }
    this.user.save = sinon.stub().resolves(self.user)
    this.UserModel = class Project {
      constructor() {
        return self.user
      }
    }
    this.UserCreator = SandboxedModule.require(modulePath, {
      globals: {
        console: console
      },
      requires: {
        '../../models/User': { User: this.UserModel },
        'logger-sharelatex': {
          error: sinon.stub()
        },
        'metrics-sharelatex': { timeAsyncMethod() {} },
        '../../infrastructure/Features': (this.Features = {
          hasFeature: sinon.stub().returns(false)
        }),
        './UserGetter': (this.UserGetter = {
          promises: {
            getUser: sinon.stub().resolves(this.user)
          }
        }),
        './UserUpdater': (this.UserUpdater = {
          promises: {
            addAffiliationForNewUser: sinon
              .stub()
              .resolves({ n: 1, nModified: 1, ok: 1 }),
            updateUser: sinon.stub().resolves()
          }
        })
      }
    })

    this.email = 'bob.oswald@gmail.com'
  })

  describe('createNewUser', function () {
    describe('with callbacks', function () {
      it('should take the opts and put them in the model', function (done) {
        const opts = {
          email: this.email,
          holdingAccount: true
        }
        this.UserCreator.createNewUser(opts, (err, user) => {
          assert.ifError(err)
          assert.equal(user.email, this.email)
          assert.equal(user.holdingAccount, true)
          assert.equal(user.first_name, 'bob.oswald')
          done()
        })
      })

      it('should use the start of the email if the first name is empty string', function (done) {
        const opts = {
          email: this.email,
          holdingAccount: true,
          first_name: ''
        }
        this.UserCreator.createNewUser(opts, (err, user) => {
          assert.ifError(err)
          assert.equal(user.email, this.email)
          assert.equal(user.holdingAccount, true)
          assert.equal(user.first_name, 'bob.oswald')
          done()
        })
      })

      it('should use the first name if passed', function (done) {
        const opts = {
          email: this.email,
          holdingAccount: true,
          first_name: 'fiiirstname'
        }
        this.UserCreator.createNewUser(opts, (err, user) => {
          assert.ifError(err)
          assert.equal(user.email, this.email)
          assert.equal(user.holdingAccount, true)
          assert.equal(user.first_name, 'fiiirstname')
          done()
        })
      })

      it('should use the last name if passed', function (done) {
        const opts = {
          email: this.email,
          holdingAccount: true,
          last_name: 'lastNammmmeee'
        }
        this.UserCreator.createNewUser(opts, (err, user) => {
          assert.ifError(err)
          assert.equal(user.email, this.email)
          assert.equal(user.holdingAccount, true)
          assert.equal(user.last_name, 'lastNammmmeee')
          done()
        })
      })

      it('should set emails attribute', function (done) {
        this.UserCreator.createNewUser({ email: this.email }, (err, user) => {
          assert.ifError(err)
          user.email.should.equal(this.email)
          user.emails.length.should.equal(1)
          user.emails[0].email.should.equal(this.email)
          user.emails[0].createdAt.should.be.a('date')
          user.emails[0].reversedHostname.should.equal('moc.liamg')
          done()
        })
      })

      it('should not add affiliation', function () {})

      describe('with affiliations feature', function () {
        let attributes, user
        beforeEach(function () {
          attributes = { email: this.email }
          this.Features.hasFeature = sinon
            .stub()
            .withArgs('affiliations')
            .returns(true)
        })
        describe('when v1 affiliations API does not return an error', function () {
          beforeEach(function (done) {
            this.UserCreator.createNewUser(attributes, (err, createdUser) => {
              user = createdUser
              assert.ifError(err)
              done()
            })
          })
          it('should flag that affiliation is unchecked', function () {
            user.emails[0].affiliationUnchecked.should.equal(true)
          })
          it('should try to add affiliation to v1', function () {
            sinon.assert.calledOnce(
              this.UserUpdater.promises.addAffiliationForNewUser
            )
            sinon.assert.calledWithMatch(
              this.UserUpdater.promises.addAffiliationForNewUser,
              user._id,
              this.email
            )
          })
          it('should query for updated user data', function () {
            sinon.assert.calledOnce(this.UserGetter.promises.getUser)
          })
        })
        describe('when v1 affiliations API does return an error', function () {
          beforeEach(function (done) {
            this.UserUpdater.promises.addAffiliationForNewUser.rejects()
            this.UserCreator.createNewUser(attributes, (error, createdUser) => {
              user = createdUser
              assert.ifError(error)
              done()
            })
          })
          it('should flag that affiliation is unchecked', function () {
            user.emails[0].affiliationUnchecked.should.equal(true)
          })
          it('should try to add affiliation to v1', function () {
            sinon.assert.calledOnce(
              this.UserUpdater.promises.addAffiliationForNewUser
            )
            sinon.assert.calledWithMatch(
              this.UserUpdater.promises.addAffiliationForNewUser,
              user._id,
              this.email
            )
          })
          it('should query for updated user data', function () {
            sinon.assert.calledOnce(this.UserGetter.promises.getUser)
          })
        })
      })

      it('should not add affiliation when without affiliation feature', function (done) {
        const attributes = { email: this.email }
        this.UserCreator.createNewUser(attributes, (err, user) => {
          assert.ifError(err)
          sinon.assert.notCalled(
            this.UserUpdater.promises.addAffiliationForNewUser
          )
          done()
        })
      })
    })

    describe('with promises', function () {
      it('should take the opts and put them in the model', async function () {
        const opts = {
          email: this.email,
          holdingAccount: true
        }
        const user = await this.UserCreator.promises.createNewUser(opts)
        assert.equal(user.email, this.email)
        assert.equal(user.holdingAccount, true)
        assert.equal(user.first_name, 'bob.oswald')
      })

      it('should add affiliation when with affiliation feature', async function () {
        this.Features.hasFeature = sinon
          .stub()
          .withArgs('affiliations')
          .returns(true)
        const attributes = { email: this.email }
        const user = await this.UserCreator.promises.createNewUser(attributes)
        sinon.assert.calledOnce(
          this.UserUpdater.promises.addAffiliationForNewUser
        )
        sinon.assert.calledWithMatch(
          this.UserUpdater.promises.addAffiliationForNewUser,
          user._id,
          this.email
        )
      })

      it('should not add affiliation when without affiliation feature', async function () {
        this.Features.hasFeature = sinon.stub().returns(false)
        const attributes = { email: this.email }
        await this.UserCreator.promises.createNewUser(attributes)
        sinon.assert.notCalled(
          this.UserUpdater.promises.addAffiliationForNewUser
        )
      })

      it('should include SAML provider ID with email', async function () {
        const attributes = {
          email: this.email,
          samlIdentifiers: [{ email: this.email, providerId: '1' }]
        }
        const user = await this.UserCreator.promises.createNewUser(attributes)
        assert.equal(user.emails[0].samlProviderId, '1')
      })
    })
  })
})
