/* eslint-disable
    camelcase,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
    expect
} = require("chai");
const request = require('./helpers/request');
const Settings = require("settings-sharelatex");

const auth = Buffer.from('sharelatex:password').toString("base64");
const authed_request = request.defaults({
	headers: {
		Authorization: `Basic ${auth}`
	}
});


describe('ApiClsiTests', function() {
	describe('compile', function() {
		before(function(done) {
			this.compileSpec = {
				compile: {
					options: {
						compiler: 'pdflatex',
						timeout: 60
					},
					rootResourcePath: 'main.tex',
					resources: [{
						path: 'main/tex',
						content: "\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}"
					}
					, {
						path: 'image.png',
						url: 'www.example.com/image.png',
						modified: 123456789
					}
					]
				}
			};
			return done();
		});

		describe('valid request', () => it('returns success and a list of output files', function(done) {
            return authed_request.post({
                uri: '/api/clsi/compile/abcd',
                json: this.compileSpec
                }, function(error, response, body) {
                    if (error != null) { throw error; }
                    expect(response.statusCode).to.equal(200);
                    expect(response.body).to.deep.equal({
                        status: 'success',
                        outputFiles: [{
                            path: 'project.pdf',
                            url: '/project/abcd/build/1234/output/project.pdf',
                            type: 'pdf',
                            build: 1234
                        }
                        , {
                            path: 'project.log',
                            url: '/project/abcd/build/1234/output/project.log',
                            type: 'log',
                            build: 1234
                        }
                        ]
                    });
                    return done();
            });
        }));

		return describe('unauthorized', () => it('returns 401', function(done) {
            return request.post({
                uri: '/api/clsi/compile/abcd',
                json: this.compileSpec
                }, function(error, response, body) {
                    if (error != null) { throw error; }
                    expect(response.statusCode).to.equal(401);
                    expect(response.body).to.equal('Unauthorized');
                    return done();
            });
        }));
	});

	return describe('get output', function() {
		describe('valid file', () => it('returns the file', done => authed_request.get('/api/clsi/compile/abcd/build/1234/output/project.pdf', function(error, response, body) {
            if (error != null) { throw error; }
            expect(response.statusCode).to.equal(200);
            expect(response.body).to.equal('mock-pdf');
            return done();
        })));

		describe('invalid file', () => it('returns 404', done => authed_request.get('/api/clsi/compile/abcd/build/1234/output/project.aux', function(error, response, body) {
            if (error != null) { throw error; }
            expect(response.statusCode).to.equal(404);
            expect(response.body).to.not.equal('mock-pdf');
            return done();
        })));

		return describe('unauthorized', () => it('returns 401', done => request.get('/api/clsi/compile/abcd/build/1234/output/project.pdf', function(error, response, body) {
            if (error != null) { throw error; }
            expect(response.statusCode).to.equal(401);
            expect(response.body).to.not.equal('mock-pdf');
            return done();
        })));
	});
});
