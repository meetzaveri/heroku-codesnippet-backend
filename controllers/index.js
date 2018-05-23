const contentRoutes = require('./authcontroller.js');
const userRoutes = require('./usercontroller.js');

module.exports = function(app, db) {
  contentRoutes(app, db);
  userRoutes(app,db);
  // Other route groups could go here, in the future
};