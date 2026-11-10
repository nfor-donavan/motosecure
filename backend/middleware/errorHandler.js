"use strict";
const notFound = (req, res, next) => next(Object.assign(new Error(`Route not found: ${req.method} ${req.path}`), { status: 404 }));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message;

  if (err.type === "entity.parse.failed") { status = 400; message = "Malformed JSON body"; }
  else if (err.type === "entity.too.large") { status = 413; message = "Request body too large"; }
  else if (err.name === "CastError") { status = err.kind === "ObjectId" ? 404 : 400; message = err.kind === "ObjectId" ? "Resource not found" : "Invalid value supplied"; }
  else if (err.code === 11000) { status = 409; message = `Duplicate value for field: ${Object.keys(err.keyValue || {}).join(", ")}`; }
  else if (err.name === "ValidationError") { status = 400; message = Object.values(err.errors).map((e) => e.message).join("; "); }

  const production = process.env.NODE_ENV === "production";
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.path}:`, err.stack || err.message);
    if (production) message = "Internal server error";
  }
  res.status(status).json({ success: false, message, ...(production ? {} : { stack: err.stack }) });
};

module.exports = { notFound, errorHandler };
