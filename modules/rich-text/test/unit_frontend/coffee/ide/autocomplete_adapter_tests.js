define ['ide/rich-text/autocomplete_adapter'], (AutocompleteAdapter) ->
  describe 'AutocompleteAdapter', () ->
    beforeEach () ->
      @metadata = {}
      @autocompleteAdapter = new AutocompleteAdapter({}, @metadata, [])

    describe 'onChange', () ->
      it 'typing on line with \\usepackage schedules metadata load', () ->
        cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 12 }) # Cursor is in \usepackage argument
          getLine: sinon.stub().withArgs(12).returns('\\usepackage{}')
        }
        @metadata.scheduleLoadDocMetaFromServer = sinon.stub()

        @autocompleteAdapter.onChange(cm)

        expect(@metadata.scheduleLoadDocMetaFromServer).to.have.been.called

      it 'typing on line with \\RequirePackage schedules metadata load', () ->
        cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 16 }) # Cursor is in \RequirePacakge argument
          getLine: sinon.stub().withArgs(16).returns('\\RequirePackage{}')
        }
        @metadata.scheduleLoadDocMetaFromServer = sinon.stub()

        @autocompleteAdapter.onChange(cm)

        expect(@metadata.scheduleLoadDocMetaFromServer).to.have.been.called

      it 'typing on line with \\label schedules metadata load', () ->
        cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 7 }) # Cursor is in \label argument
          getLine: sinon.stub().withArgs(7).returns('\\label{}')
        }
        @metadata.scheduleLoadDocMetaFromServer = sinon.stub()

        @autocompleteAdapter.onChange(cm)

        expect(@metadata.scheduleLoadDocMetaFromServer).to.have.been.called

      it 'typing after metadata command schedules metadata load', () ->
        # IMPORTANT NOTE: This is undesirable behaviour that we would like to
        # fix, but I wanted to cover it anyway
        cm = {
          getCursor: sinon.stub().returns({ line: 0, ch: 12 }) # Cursor is in \label argument
          getLine: sinon.stub().withArgs(12).returns('\\label{} foo')
        }
        @metadata.scheduleLoadDocMetaFromServer = sinon.stub()

        @autocompleteAdapter.onChange(cm)

        expect(@metadata.scheduleLoadDocMetaFromServer).to.have.been.called
