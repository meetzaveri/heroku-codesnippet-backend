const userAPIfunctions = require('../controllers/usercontroller');

module.exports = function (app, db) {

    // Runs code snippet
    app.post('/run-code', userAPIfunctions.runCodeSnippet);

    // Getting the individual codesnippets
    app.get('/codes/:id', userAPIfunctions.getCodeSnippet);

    // Getting codes
    app.get('/codes', userAPIfunctions.getAllCodeSnippets);

    // Creating the codesnippet
    app.post('/codes', userAPIfunctions.postCodeSnippet);

    // Updating the codes
    app.put('/codes/:id', userAPIfunctions.updateCodeSnippet);

    // Deleting the codes
    app.delete('/codes/:id', userAPIfunctions.deleteCodeSnippet);
};
