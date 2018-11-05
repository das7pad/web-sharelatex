/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['ide/rich-text/autocomplete_adapter'], AutocompleteAdapter =>
  describe('AutocompleteAdapter', function() {
    beforeEach(function() {
      this.metadata = {};
      return this.autocompleteAdapter = new AutocompleteAdapter({}, this.metadata, []);
    });

    return describe('onChange', function() {
      it('typing on line with \\usepackage schedules metadata load', function() {
        const cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 12 }), // Cursor is in \usepackage argument
          getLine: sinon.stub().withArgs(12).returns('\\usepackage{}')
        };
        this.metadata.scheduleLoadDocMetaFromServer = sinon.stub();

        this.autocompleteAdapter.onChange(cm);

        return expect(this.metadata.scheduleLoadDocMetaFromServer).to.have.been.called;
      });

      it('typing on line with \\RequirePackage schedules metadata load', function() {
        const cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 16 }), // Cursor is in \RequirePacakge argument
          getLine: sinon.stub().withArgs(16).returns('\\RequirePackage{}')
        };
        this.metadata.scheduleLoadDocMetaFromServer = sinon.stub();

        this.autocompleteAdapter.onChange(cm);

        return expect(this.metadata.scheduleLoadDocMetaFromServer).to.have.been.called;
      });

      it('typing on line with \\label schedules metadata load', function() {
        const cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 7 }), // Cursor is in \label argument
          getLine: sinon.stub().withArgs(7).returns('\\label{}')
        };
        this.metadata.scheduleLoadDocMetaFromServer = sinon.stub();

        this.autocompleteAdapter.onChange(cm);

        return expect(this.metadata.scheduleLoadDocMetaFromServer).to.have.been.called;
      });

      return it('typing after metadata command schedules metadata load', function() {
        // IMPORTANT NOTE: This is undesirable behaviour that we would like to
        // fix, but I wanted to cover it anyway
        const cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 12 }), // Cursor is in \label argument
          getLine: sinon.stub().withArgs(12).returns('\\label{} foo')
        };
        this.metadata.scheduleLoadDocMetaFromServer = sinon.stub();

        this.autocompleteAdapter.onChange(cm);

        return expect(this.metadata.scheduleLoadDocMetaFromServer).to.have.been.called;
      });
    });
  })
);
