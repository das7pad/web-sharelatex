module.exports = {
  redirect
}

// redirect the request via headers or JSON response depending on the request
// format
function redirect(req, res, redir) {
  if ((req.headers.accept || '').match(/^application\/json/)) {
    res.json({ redir })
  } else {
    res.redirect(redir)
  }
}
