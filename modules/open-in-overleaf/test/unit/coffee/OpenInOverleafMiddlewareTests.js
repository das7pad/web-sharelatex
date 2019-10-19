/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
    assert
} = require("chai");
const sinon = require('sinon');
const chai = require('chai');
const should = chai.should();
const {
    expect
} = chai;
const modulePath = "../../../app/js/OpenInOverleafMiddleware.js";
const SandboxedModule = require('sandboxed-module');

describe('OpenInOverleafMiddleware', function() {
	beforeEach(function() {
		this.snip = 'snippy snippy snap snap';
		this.Csrf =
			{validateRequest: sinon.stub().callsArgWith(1, true)};
		this.AuthenticationController = {
			isUserLoggedIn: sinon.stub().returns(true),
			setRedirectInSession: sinon.stub()
		};
		this.req = {
			method: 'POST',
			originalUrl: '/docs',
			body: {
				type: 'body'
			},
			query: {
				type: 'query'
			}
		};
		this.res = {};
		this.next = sinon.stub();

		return this.OpenInOverleafMiddleware = SandboxedModule.require(modulePath, { requires: {
			"logger-sharelatex": {
				log() {},
				err() {}
			},
			'../../../../app/js/Features/Authentication/AuthenticationController': this.AuthenticationController,
			'../../../../app/js/infrastructure/Csrf': this.Csrf
		}
	}
		);
	});

	return describe('middleware', function() {
		beforeEach(function() {
			return this.OpenInOverleafMiddleware._renderGateway = sinon.stub();
		});

		it('calls the callback when the user is logged in and the csrf is valid', function() {
			this.OpenInOverleafMiddleware.middleware(this.req, this.res, this.next);
			sinon.assert.called(this.next);
			return sinon.assert.notCalled(this.OpenInOverleafMiddleware._renderGateway);
		});

		it('renders the gateway for submission if the user is logged in but the csrf is invalid', function() {
			this.Csrf.validateRequest = sinon.stub().callsArgWith(1, false);
			this.OpenInOverleafMiddleware.middleware(this.req, this.res, this.next);
			sinon.assert.calledWith(this.OpenInOverleafMiddleware._renderGateway, this.req, 'submit');
			return sinon.assert.notCalled(this.next);
		});

		it('renders the gateway for redirecting if the user is not logged in ', function() {
			this.AuthenticationController.isUserLoggedIn = sinon.stub().returns(false);
			this.OpenInOverleafMiddleware.middleware(this.req, this.res, this.next);
			sinon.assert.calledWith(this.OpenInOverleafMiddleware._renderGateway, this.req, 'store', sinon.match(/^\/login/));
			sinon.assert.called(this.AuthenticationController.setRedirectInSession);
			return sinon.assert.notCalled(this.next);
		});

		return describe("when the method is GET", function() {
			beforeEach(function() {
				return this.req.method = 'GET';
			});

			it('renders the gateway for submission if the user is logged in and the csrf is valid', function() {
				this.OpenInOverleafMiddleware.middleware(this.req, this.res, this.next);
				return sinon.assert.calledWith(this.OpenInOverleafMiddleware._renderGateway, this.req, 'submit');
			});

			return it('renders the gateway for redirecting if the user is not logged in', function() {
				this.AuthenticationController.isUserLoggedIn = sinon.stub().returns(false);
				this.OpenInOverleafMiddleware.middleware(this.req, this.res, this.next);
				sinon.assert.calledWith(this.OpenInOverleafMiddleware._renderGateway, this.req, 'store', sinon.match(/^\/login/));
				sinon.assert.called(this.AuthenticationController.setRedirectInSession);
				return sinon.assert.notCalled(this.next);
			});
		});
	});
});
