"use strict";
/** Creates an Error carrying an HTTP status for the central error handler. */
module.exports = (status, message) => Object.assign(new Error(message), { status });
