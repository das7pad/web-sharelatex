# MathJax inline-scripts

Regenerate the chunks in dropping the MathJax.js CSP hack:

1. Install upstream version of mathjax package.
2. Set a break point in `MathJax.Ajax.Styles`, after the de-serialization of
    styles:
    ```js
    var styleString = this.StyleString(styles)
    ```
    Export the value of `styleString` into a new chunk file.
