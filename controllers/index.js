const contentRoutes = require('./authcontroller.js');

module.exports = function(app, db) {
  contentRoutes(app, db);
  // Other route groups could go here, in the future
};