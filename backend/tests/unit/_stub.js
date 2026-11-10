"use strict";
// Loads a module while substituting named dependencies, so real
// middleware code can be executed without installing the full stack.
const Module = require("module");
function withStubs(stubs, loader) {
  const original = Module._load;
  Module._load = function (request) {
    for (const [key, value] of Object.entries(stubs)) {
      if (request === key || request.endsWith(`/${key}`)) return value;
    }
    return original.apply(this, arguments);
  };
  try { return loader(); } finally { Module._load = original; }
}
const run = (middleware, req) => new Promise((resolve) => middleware(req, {}, (err) => resolve(err)));
module.exports = { withStubs, run };
