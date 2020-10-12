# Precompile pug templates

`pug` is compiling `.pug` templates into functions with a signature of
 `template(locales) { return html }`.

The template functions use helpers for generating sanitized attributes,
 escaping html and similar tasks.

- The package `pug-runtime` has all these helpers for generating html.
- The package `pug` is the generator package for template functions.
   It is not needed at app run-time, unless one wants to regenerate the
   templates -- e.g. for rapid development.

Generating a template function is a fairly slow task -- about O(500ms) for the
 editor template on a modern i7 processor.
 It is an eventloop blocking computation and can cause issues with network
 connections during App start-up [1].

Instead of generating the template functions at run-time, we can generate them
 in advance and load them during start-up, just like any other module.
 Loading them back from disk is very fast!
 NodeJS can load all the 50+ modules with template functions in about O(40ms).

There is still some penalty for any first request which renders any view
 (possibly for warming the v8 caches of express and pug-runtime code paths),
 but this is in the O(20ms) range and negligible.
 The smoke-tests will likely catch this too as they request actual rendered
  views.

---

[1] As an example, the server selection timeout in the mongodb driver with a
     default of 30s is not enough and required a bump past 45s to 60s (see
     commit `293349261d0d419bbd78827beec294d108f71061` in web /
     `89b79e4fd5043b003da4ef103ddc919909aa7893` in web-internal).
