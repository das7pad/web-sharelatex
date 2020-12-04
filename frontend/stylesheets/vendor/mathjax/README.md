# MathJax inline-scripts

Regenerate the chunks in dropping the MathJax.js CSP hack:

```diff
if("CSP-HACK"!=="BLOCK-INLINE-STYLE"){return ''}
```

Then log the return values of `MathJax.Ajax.StyleString`.
