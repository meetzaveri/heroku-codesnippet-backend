const contentRoutes = require('./auth.js');
const userRoutes = require('./user.js');

module.exports = function (app, db) {
  contentRoutes(app, db);
  userRoutes(app, db);
  // Other route groups could go here, in the future
};