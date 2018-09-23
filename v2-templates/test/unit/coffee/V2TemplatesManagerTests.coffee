Path = require "path"
SandboxedModule = require "sandboxed-module"
chai = require "chai"
sinon = require "sinon"
sinonChai = require "sinon-chai"

chai.use sinonChai
expect = chai.expect

describe "V2TemplatesManager", ->

	modulePath = Path.resolve __dirname, "../../../app/js/V2TemplatesManager"

	beforeEach ->
		@request = sinon.stub()
		@settings =
			apis:
				v1:
					url: "overleaf.test"
		@V2TemplatesManager = SandboxedModule.require modulePath, requires:
			request: @request
			"settings-sharelatex": @settings

	describe "_formatDocPath", ->
		beforeEach ->
			@doc_mock =
				read_token: "doc-read-token"
				slug: "doc-slug"

		describe "with article content", ->
			beforeEach ->
				@doc_mock.kind = "article"

			it "should have articles path", ->
				@V2TemplatesManager._formatDocPath @doc_mock
				expect(@doc_mock.path).to.equal "/articles/doc-slug/doc-read-token"

		describe "with example content", ->
			beforeEach ->
				@doc_mock.kind = "example"

			it "should have latex/examples path", ->
				@V2TemplatesManager._formatDocPath @doc_mock
				expect(@doc_mock.path).to.equal "/latex/examples/doc-slug/doc-read-token"

		describe "with template content", ->
			beforeEach ->
				@doc_mock.kind = "template"

			it "should have latex/templates path", ->
				@V2TemplatesManager._formatDocPath @doc_mock
				expect(@doc_mock.path).to.equal "/latex/templates/doc-slug/doc-read-token"

	describe "_formatIndexData", ->
		beforeEach ->
			@V2TemplatesManager._formatDocPath = sinon.stub()
			@V2TemplatesManager._paginate = sinon.stub()

		describe "when popular_docs", ->
			beforeEach ->
				@page_mock =
					popular_docs: [
						"popular-doc-1",
						"popular-doc-2"
					]

			it "should format path for each doc", ->
				@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
				expect(@V2TemplatesManager._formatDocPath).to.have.been.calledTwice
					.and.to.have.been.calledWith "popular-doc-1"
					.and.to.have.been.calledWith "popular-doc-2"

			describe "when only one page", ->
				beforeEach ->
					@page_mock.popular_docs_pages =
						total_pages: 1

				it "should not do pagination", ->
					@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
					expect(@V2TemplatesManager._paginate).not.to.have.been.called

			describe "when more than one page", ->
				beforeEach ->
					@page_mock.popular_docs_pages =
						total_pages: 2
					@V2TemplatesManager._paginate = sinon.stub().returns "popular-pagination"

				it "should do pagination", ->
					@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
					expect(@V2TemplatesManager._paginate).to.have.been.calledOnce
						.and.calledWith @page_mock.popular_docs_pages, "page-path/popular"
					expect(@page_mock.popular_docs_pagination).to.equal "popular-pagination"

		describe "when recent_docs", ->
			beforeEach ->
				@page_mock =
					recent_docs: [
						"recent-doc-1",
						"recent-doc-2"
					]

			it "should format path for each doc", ->
				@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
				expect(@V2TemplatesManager._formatDocPath).to.have.been.calledTwice
					.and.to.have.been.calledWith "recent-doc-1"
					.and.to.have.been.calledWith "recent-doc-2"

			describe "when only one page", ->
				beforeEach ->
					@page_mock.recent_docs_pages =
						total_pages: 1

				it "should not do pagination", ->
					@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
					expect(@V2TemplatesManager._paginate).not.to.have.been.called

			describe "when more than one page", ->
				beforeEach ->
					@page_mock.recent_docs_pages =
						total_pages: 2
					@V2TemplatesManager._paginate = sinon.stub().returns "recent-pagination"

				it "should do pagination", ->
					@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
					expect(@V2TemplatesManager._paginate).to.have.been.calledOnce
						.and.calledWith @page_mock.recent_docs_pages, "page-path/recent"
					expect(@page_mock.recent_docs_pagination).to.equal "recent-pagination"

		describe "when tagged_docs", ->
			beforeEach ->
				@page_mock =
					tagged_docs: [
						"tagged-doc-1",
						"tagged-doc-2"
					]

			it "should format path for each doc", ->
				@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
				expect(@V2TemplatesManager._formatDocPath).to.have.been.calledTwice
					.and.to.have.been.calledWith "tagged-doc-1"
					.and.to.have.been.calledWith "tagged-doc-2"

			describe "when only one page", ->
				beforeEach ->
					@page_mock.tagged_docs_pages =
						total_pages: 1

				it "should not do pagination", ->
					@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
					expect(@V2TemplatesManager._paginate).not.to.have.been.called

			describe "when more than one page", ->
				beforeEach ->
					@page_mock.tagged_docs_pages =
						total_pages: 2
					@V2TemplatesManager._paginate = sinon.stub().returns "tagged-pagination"

				it "should do pagination", ->
					@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
					expect(@V2TemplatesManager._paginate).to.have.been.calledOnce
						.and.calledWith @page_mock.tagged_docs_pages, "page-path"
					expect(@page_mock.tagged_docs_pagination).to.equal "tagged-pagination"

		describe "when tags", ->
			beforeEach ->
				@page_mock =
					tags: [
						{ name: 'tag-1' },
						{ name: 'tag-2' }
					]

			it "should create path for tags", ->
				@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
				expect(@page_mock.tags[0].path).to.equal "base-path/tagged/tag-1"
				expect(@page_mock.tags[1].path).to.equal "base-path/tagged/tag-2"

		describe "when related_tags", ->
			beforeEach ->
				@page_mock =
					related_tags: [
						{ name: 'tag-1' },
						{ name: 'tag-2' }
					]

			it "should create path for related_tags", ->
				@V2TemplatesManager._formatIndexData @page_mock, "base-path", "page-path"
				expect(@page_mock.related_tags[0].path).to.equal "base-path/tagged/tag-1"
				expect(@page_mock.related_tags[1].path).to.equal "base-path/tagged/tag-2"

	describe "_formatTemplateData", ->
		beforeEach ->
			@content_type_mock =
				path: "path"
				page_title: "page-title"
			@page_mock =
				pdf_links:
					main:
						pdf: "pdf_link"
				pub:
					author: "author"
					description: "description"
					meta_description: "meta-description"
					title: "title"

		describe "with basic properties", ->
			beforeEach ->
				@V2TemplatesManager._formatTemplateData(@page_mock, @content_type_mock)

			it "should set meta", ->
				expect(@page_mock.meta).to.equal "meta-description"
			it "should set title", ->
				expect( @page_mock.title ).to.equal "title"
			it "should set find_more", ->
				expect(@page_mock.find_more.href).to.equal "path"
				expect(@page_mock.find_more.text).to.equal "Find More page-title"

		describe "when pub_tags", ->
			beforeEach ->
				@page_mock.pub_tags = [
					{name: "tag-1"},
					{name: "tag-2"}
				]
				@V2TemplatesManager._formatTemplateData(@page_mock, @content_type_mock)

			it "should create path for tags", ->
				expect(@page_mock.pub_tags[0].path).to.equal "/gallery/tagged/tag-1"
				expect(@page_mock.pub_tags[1].path).to.equal "/gallery/tagged/tag-2"

		describe "when old_versions", ->
			beforeEach ->
				@page_mock.old_versions = [
					{id: "old-version-1"},
					{id: "old-version-2"}
				]
				@page_mock.open_in_v2_links =
					"old-version-1":
						v2:
							"v2-link-1"
					"old-version-2":
						v2:
							"v2-link-2"
				@V2TemplatesManager._formatTemplateData(@page_mock, @content_type_mock)

			it "should set template link for old versions", ->
				expect(@page_mock.old_versions[0].open_link).to.equal "v2-link-1"
				expect(@page_mock.old_versions[1].open_link).to.equal "v2-link-2"

	describe "get", ->
		describe "when request succeeds", ->
			beforeEach ->
				@response_mock =
					body: "response"
				@request.callsArgWith(1, null, @response_mock)

			it "should set default params for request", ->
				@V2TemplatesManager._get "/test-url", () =>
					expect(@request.firstCall.args[0]).to.deep.equal
						headers:
							Accept: "application/json"
						json: true
						uri: "overleaf.test/test-url"

			it "should callback with response body", ->
				@V2TemplatesManager._get "/test-url", (err, response) =>
					expect(err).to.equal null
					expect(response).to.equal "response"

		describe "when request has an error", ->
			beforeEach ->
				@request.callsArgWith(1, "error")

			it "should callback with error", ->
				@V2TemplatesManager._get "/test-url", (err) =>
					expect(err).to.equal "error"

	describe "getPage", ->
		describe "when get succeeds", ->
			beforeEach ->
				@page_mock =
					page: "mock"
				@V2TemplatesManager._formatIndexData = sinon.stub()
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, null, @page_mock

			it "should get page from api", ->
				@V2TemplatesManager.getPage "article", () =>
					expect(
						@V2TemplatesManager._get.firstCall.args[0]
					).to.equal "/articles"

			it "should call _formatTemplateData", ->
				@V2TemplatesManager.getPage "article", () =>
					expect(
						@V2TemplatesManager._formatIndexData.callCount
					).to.equal 1

			it "should merge content data", ->
				@V2TemplatesManager.getPage "article", (err, page) =>
					expect(page.page).to.equal "mock"
					expect(page.path).to.equal "/articles"

		describe "when get has error", ->
			beforeEach ->
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, "error"

			it "should callback with error", ->
				@V2TemplatesManager.getPage "article", (err) =>
					expect(err).to.equal "error"

		describe "when content_type_name invalid", ->

			it "should callback with error", ->
				@V2TemplatesManager.getPage "invalid", (err) =>
					expect(err).to.deep.equal new Error "invalid content_type_name"

	describe "getPagePaginated", ->
		describe "when get succeeds", ->
			beforeEach ->
				@page_mock =
					page: "mock"
				@V2TemplatesManager._formatIndexData = sinon.stub()
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, null, @page_mock

			it "should get page from api", ->
				@V2TemplatesManager.getPagePaginated "article", "segment", "1", () =>
					expect(
						@V2TemplatesManager._get.firstCall.args[0]
					).to.equal "/articles/segment/page/1"

			it "should call _formatTemplateData", ->
				@V2TemplatesManager.getPagePaginated "article", "segment", "1", () =>
					expect(@V2TemplatesManager._formatIndexData).to.have.been.calledOnce

			it "should merge content data", ->
				@V2TemplatesManager.getPagePaginated "article", "segment", "1", (err, page) =>
					expect(page.page).to.equal "mock"
					expect(page.path).to.equal "/articles"

			it "should set additional properties", ->
				@V2TemplatesManager.getPagePaginated "article", "segment", "1", (err, page) =>
					expect(page.hide_segment_title).to.equal true
					expect(page.page_title).to.equal "Articles — Segment"

		describe "when get has error", ->
			beforeEach ->
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, "error"

			it "should callback with error", ->
				@V2TemplatesManager.getPagePaginated "article", "segment", "1", (err) =>
					expect(err).to.equal "error"

		describe "when content_type_name invalid", ->

			it "should callback with error", ->
				@V2TemplatesManager.getPagePaginated "invalid", "segment", "1", (err) =>
					expect(err).to.deep.equal new Error "invalid content_type_name"

	describe "getPageTagged", ->
		describe "when get succeeds", ->
			beforeEach ->
				@tag_mock =
					title: "tag-title"
					top_html: "top-html"
				@page_mock =
					page: "mock"
					tags: [ @tag_mock ]
				@V2TemplatesManager._formatIndexData = sinon.stub()
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, null, @page_mock

			it "should get page from api", ->
				@V2TemplatesManager.getPageTagged "article", "tag_name", "1", () =>
					expect(@V2TemplatesManager._get).to.have.been.calledWithMatch("/articles/tagged/tag_name/page/1")

			it "should call _formatTemplateData", ->
				@V2TemplatesManager.getPageTagged "article", "tag_name", "1", () =>
					expect(@V2TemplatesManager._formatIndexData).to.have.been.calledOnce

			it "should merge content data", ->
				@V2TemplatesManager.getPageTagged "article", "tag_name", "1", (err, page) =>
					expect(page.page).to.equal "mock"
					expect(page.path).to.equal "/articles"

			it "should set additional properties", ->
				@V2TemplatesManager.getPageTagged "article", "tag_name", "1", (err, page) =>
					expect(page.tag).to.deep.equal @tag_mock
					expect(page.page_title).to.equal "Articles — tag-title"
					expect(page.summary).to.equal "top-html"

		describe "when get has error", ->
			beforeEach ->
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, "error"

			it "should callback with error", ->
				@V2TemplatesManager.getPageTagged "article", "tag_name", "1", (err) =>
					expect(err).to.equal "error"

		describe "when content_type_name invalid", ->

			it "should callback with error", ->
				@V2TemplatesManager.getPageTagged "invalid", "tag_name", "1", (err) =>
					expect(err).to.deep.equal new Error "invalid content_type_name"

	describe "getTemplate", ->
		describe "when get succeeds", ->
			beforeEach ->
				@page_mock =
					pub:
						kind: "article"
				@V2TemplatesManager._formatTemplateData = sinon.stub()
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, null, @page_mock

			it "should get page from api", ->
				@V2TemplatesManager.getTemplate "slug", "read_token", () =>
					expect(@V2TemplatesManager._get).to.have.been.calledWithMatch("/latex/templates/slug/read_token")

			it "should callback with page", ->
				@V2TemplatesManager.getTemplate "slug", "read_token", (err, page) =>
					expect(page).to.deep.equal @page_mock

			describe "when page.kind invalid", ->
				beforeEach ->
					@page_mock.pub.kind = "invalid"

				it "should callback with error", ->
					@V2TemplatesManager.getTemplate "slug", "read_token", (err) =>
						expect(err).to.deep.equal new Error "invalid page.kind"

		describe "when get has error", ->
			beforeEach ->
				@V2TemplatesManager._get = sinon.stub().callsArgWith 1, "error"

			it "should callback with error", ->
				@V2TemplatesManager.getTemplate "slug", "read_token", (err) =>
					expect(err).to.equal "error"

	describe "_paginate", ->
		beforeEach ->
			@pages_mock =
				current_page: 1
				total_pages: 2

		describe "page 1 of 2", ->
			beforeEach ->
				@pagination = @V2TemplatesManager._paginate @pages_mock, "/page_path"

			it "should set active page", ->
				expect(@pagination[0]).to.deep.equal
					active: true
					text: "1"

			it "should append pages to page_path", ->
				expect(@pagination[1].href).to.equal "/page_path/page/2"
				expect(@pagination[2].href).to.equal "/page_path/page/2"
				expect(@pagination[3].href).to.equal "/page_path/page/2"
			
			it "should set rel next tag", ->
				expect(@pagination[2].rel).to.equal "next"

		describe "page 2 of 2", ->
			beforeEach ->
				@pages_mock.current_page = 2
				@pagination = @V2TemplatesManager._paginate @pages_mock, "/page_path"

			it "should set first page as page_path", ->
				expect(@pagination[0].href).to.equal "/page_path"
				expect(@pagination[1].href).to.equal "/page_path"

			it "should append pages to page_path", ->
				expect(@pagination[2].href).to.equal "/page_path/page/1"
			
			it "should set rel prev tag", ->
				expect(@pagination[1].rel).to.equal "prev"

		describe "page 1 of 6", ->
			beforeEach ->
				@pages_mock.current_page = 1
				@pages_mock.total_pages = 6
				@pagination = @V2TemplatesManager._paginate @pages_mock, "/page_path"

			it "should only show next 4 pages", ->
				expect(@pagination.length).to.equal 8
				expect(@pagination[1].href).to.equal "/page_path/page/2"
				expect(@pagination[2].href).to.equal "/page_path/page/3"
				expect(@pagination[3].href).to.equal "/page_path/page/4"
				expect(@pagination[4].href).to.equal "/page_path/page/5"

			it "should set ellipsis after next page links", ->
				expect(@pagination[5].text).to.equal "…"

			it "should set next page link", ->
				expect(@pagination[6].href).to.equal "/page_path/page/2"

			it "should set last page link", ->
				expect(@pagination[7].href).to.equal "/page_path/page/6"

		describe "page 6 of 12", ->
			beforeEach ->
				@pages_mock.current_page = 6
				@pages_mock.total_pages = 11
				@pagination = @V2TemplatesManager._paginate @pages_mock, "/page_path"

			it "should only show prev 4 pages and next 4 pages", ->
				expect(@pagination.length).to.equal 15
				expect(@pagination[3].href).to.equal "/page_path/page/2"
				expect(@pagination[4].href).to.equal "/page_path/page/3"
				expect(@pagination[5].href).to.equal "/page_path/page/4"
				expect(@pagination[6].href).to.equal "/page_path/page/5"
				expect(@pagination[8].href).to.equal "/page_path/page/7"
				expect(@pagination[9].href).to.equal "/page_path/page/8"
				expect(@pagination[10].href).to.equal "/page_path/page/9"
				expect(@pagination[11].href).to.equal "/page_path/page/10"

			it "should set ellipsis", ->
				expect(@pagination[2].text).to.equal "…"
				expect(@pagination[12].text).to.equal "…"

