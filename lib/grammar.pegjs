start
  = endpoint +

endpoint
  = m:method " " p:path " " s:status c:(" creates " e:endpoint + { return e; }) ? { return { method: m, path: p, status: s, creates: c } }

method
  = $ "get" / "put" / "post" / "del"

path
  = path:([/a-z] +) { return path.join(''); }

status
  = status:[0-9]+ { return parseInt(status.join(""), 10); }