import Handlebars from 'handlebars';

const registerHelpers = function() {
  console.log("REGISTERING HELPERS")
  /**
   * Add ternary operator
   */
  Handlebars.registerHelper('ternary', function(variable, trueValue, falseValue) {
    if (variable) {
      return trueValue;
    }
    else {
      return falseValue;
    }
  });

  /**
   * Add equalty operator
   */
  Handlebars.registerHelper('eq', function() {
    return arguments[0] === arguments[1];
  });

  /**
   * Add greater than operator
   */
  Handlebars.registerHelper('gt', function(v1, v2) {
    return v1 > v2;
  });

  /**
   * Makes tagToColourClass accessible from within handlebars templates
   */
  Handlebars.registerHelper('tagToColourClass', function(tagName) {
    return dashApp.tagToColourClass(tagName);
  });
}

export default registerHelpers;
