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

### PublishModalController

Adds API endpoints that call through to V1 to retrieve a list of
publishing targets.
