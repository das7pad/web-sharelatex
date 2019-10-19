/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const RateLimiterMiddleware = require("../../../../app/js/Features/Security/RateLimiterMiddleware");
const WikiController = require("./WikiController");
const settings = require("settings-sharelatex");
const logger = require('logger-sharelatex');
const _ = require('lodash');
const Url = require("url");


module.exports = {
	apply(webRouter, apiRouter) {

		if (((settings.apis.wiki != null ? settings.apis.wiki.url : undefined) != null) || settings.proxyLearn) {
			//used for images onsite installs
			webRouter.get(/^\/learn-scripts\/images/, RateLimiterMiddleware.rateLimit({
				endpointName: "wiki",
				params: [],
				maxRequests: 60,
				timeInterval: 60
			}), WikiController.proxy);

			// wiki root, `/learn`
			webRouter.get(/^\/learn\/?$/i, RateLimiterMiddleware.rateLimit({
				endpointName: "wiki",
				params: [],
				maxRequests: 60,
				timeInterval: 60
			}), WikiController.getPage);

			// redirect `/learn/latex` to wiki root, `/learn`
			webRouter.get(/^\/learn\/latex\/?$/i, (req, res) => res.redirect('/learn'));
			
			// redirect `/learn/Kb/Knowledge_Base` or `/learn/how-to/Knowledge_Base`
			// to `/learn/how-to`
			webRouter.get(/^\/learn\/(Kb|how-to)\/Knowledge_Base\/?$/i,(req, res) => res.redirect('/learn/how-to'));

			// Knowledge Base redirect
			// ------------------
			// redirect `/learn/kb` to `/learn/how-to`
			// these are still under kb on the wiki,
			// the controller is set up to query for correct page.
			webRouter.get(/^\/learn\/kb(\/.*)?$/i, (req, res) => res.redirect(Url.format({
                pathname: req.path.replace(/learn\/kb/i, 'learn/how-to').replace(/%20/g, '_').replace(/\/Knowledge Base/i, ''),
                query: req.query,
            })));

			// Match either /learn/latex/:page or /learn/how-to/:page
			webRouter.get(/^\/learn\/(latex|how-to)(\/.*)?$/i, RateLimiterMiddleware.rateLimit({
				endpointName: "wiki",
				params: [],
				maxRequests: 60,
				timeInterval: 60
			}), WikiController.getPage);

			// redirect `/learn/:page` to `/learn/latex/:page`
			webRouter.get(/^\/learn(?!\/(latex\/))(.*)?$/i, (req, res) => res.redirect(req.url.replace(/^\/learn/i, '/learn/latex').replace(/\?$/, '%3F')));

			// Check if a `/learn` link exists in header_extras, either under the `Help` menu
			// or on it's own. If not, add it, either on it's own or in the `Help` menu,
			// whichever is most appropriate.
			const _getHelp = someList => _.find(someList, (e => (__guardMethod__(e != null ? e.text : undefined, 'toLowerCase', o => o.toLowerCase()) === 'help') && (e.dropdown != null)));
			const _getLearn = someList => _.find(someList, (element => element.url === '/learn'));
			const _addLearn = (targetList, optionalClass) => targetList.unshift({url: '/learn', text: 'documentation', class: optionalClass});
			return webRouter.use(function(req, res, next) {
				try {
					if (__guard__(res.locals != null ? res.locals.nav : undefined, x => x.header_extras) != null) {
						let help;
						const {
                            header_extras
                        } = res.locals.nav;
						if (help = _getHelp(header_extras)) {
							if (!_getLearn(help.dropdown)) {
								_addLearn(help.dropdown);
							}
						} else {
							if (!_getLearn(header_extras)) {
								_addLearn(header_extras, 'subdued');
							}
						}
					}
				} catch (e) {
					logger.error({error: e.message}, "could not automatically add `/learn` link to header");
				}
				return next();
			});
		}
	}
};

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}