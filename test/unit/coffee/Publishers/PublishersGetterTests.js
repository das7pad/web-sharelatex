/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SandboxedModule = require('sandboxed-module');
require('chai').should();
const {
    expect
} = require('chai');
const sinon = require('sinon');
const modulePath = require('path').join(__dirname, '../../../../app/js/Features/Publishers/PublishersGetter.js');

describe('PublishersGetter', function() {
	beforeEach(function() {
		this.publisher = {
			_id: 'mock-publsiher-id',
			slug: 'ieee',
			fetchV1Data: sinon.stub()
		};

		this.PublishersGetter = SandboxedModule.require(modulePath, { requires: {
			'../User/UserGetter': this.UserGetter,
			"../UserMembership/UserMembershipsHandler": (this.UserMembershipsHandler = {
				getEntitiesByUser: sinon.stub().callsArgWith(2, null, [this.publisher])
			}),
			"../UserMembership/UserMembershipEntityConfigs": (this.UserMembershipEntityConfigs = {
					publisher: {
						modelName: 'Publisher',
						canCreate: true,
						fields: {
							primaryKey: 'slug'
						}
					}
				}),
			'logger-sharelatex': {
				log() { return console.log(arguments); },
				err() {}
			}
		}
	}
		);

		return this.userId = '12345abcde';
	});

	return describe("getManagedPublishers", () => it('fetches v1 data before returning publisher list', function(done) {
        return this.PublishersGetter.getManagedPublishers(this.userId, function(error, publishers) {
            publishers.length.should.equal(1);
            return done();
        });
    }));
});
