The "publish modal" is a combination of components run in a modal popup via
conditional logic and in the end, a state machine. The UI components are
written with React. The AngularJS component,
`public/src/ide/controllers/PublishController.js`
glues the React components into the AngularJS UI environment.

### PublishController

The `index.coffee` injects view file, `app/views/body.pug` into the document,
which view bootstraps itself through `PublishController`.
PublishController is an AngularJS component that assembles parameters
and configuration, locates the component with class `modal-body-publish`
(itself) in the document, then activates it through call to `init`.

### index.js

A call to `init` kicks-off an ajax request to
retrieve the list of publication targets. With that list in hand, it
renders the PublishModal through ReactDOM.

### PublishModalController

Adds API endpoints that call through to V1 to retrieve a list of
publishing targets.

### PublishModal

Is the modal entry point that orchestrates which modal variants
to render. It has some logic around `initialShown` and `switchTo` properties
to determine whether to render BasicPublishModel, GuidePublishModel,
or BrandedPublishModal.

### BasicPublishModal

Is the component that renders the sectioned list of publication targets
along with a search capability.

### GuidePublishModal

Has logic around the `initialEntry` and `guideId` properties to determine
the return text, e.g. "Back to Journals and Services".

Has logic around the `shown` property to determine whether to render
PublishGuide, GalleryExport, ScholarOneExport, F1000Export, EmisExport, or
ExportGuide.

### GalleryExport

And its export cousins are state machines that render a workflow for
submission. The GalleryExport has `uninitiated`, `initiated`, and
`complete` states. Each calls upon the next after submission; so, the
"state machine" is really a simple sequence. The return link will backtrack
to the PublishModal.

On submission of the 'initiated' content, the modal contains logic to
validate the content and either re-render with error messages or initiate
wait polling with a spinner until the back-end has produced a success or
failure on the submission.
