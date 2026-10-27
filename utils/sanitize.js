// Request values used in MongoDB filters are cast to strings so objects such as
// { "$ne": null } can never be interpreted as query operators.
const toQueryString = (value) => (value === undefined || value === null ? '' : String(value));

module.exports = { toQueryString };
