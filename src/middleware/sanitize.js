const { sanitize } = require('./security');

function sanitizeBody(fields = ['body','subject','reason','description','name']) {
  return (req, res, next) => {
    for (const f of fields) {
      if (typeof req.body[f] === 'string') req.body[f] = sanitize(req.body[f]);
    }
    next();
  };
}
module.exports = { sanitizeBody };
