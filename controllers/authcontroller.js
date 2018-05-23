var ObjectID = require('mongodb').ObjectID;
var showdown  = require('showdown'),
    converter = new showdown.Converter();
var axios = require('axios');
var uuidv4 = require('uuid/v4');
var utils = require('../utils/utils');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../config/index');
var moment = require('moment')
showdown.setFlavor('github');

module.exports = function(app, db) {
   
    // Creating users for code-snippet-manager
    app.post('/createuser',(req,res) => {
        var hashedPassword = bcrypt.hashSync(req.body.password, 8);
        var profile_id = uuidv4();
        const user = {name:req.body.name,email:req.body.email,profile_id : profile_id,password:hashedPassword};
        db.collection('users').insert(user,(err,result) => {
            if(err){
                console.log('Error in if ');
                res.send({'error' : 'An error has occured'});
            } else {
                res.send(result.ops[0]);
            }
        })
    });

    // For user to login
    app.post('/login', function(req, res) {
        db.collection('users').findOne({ email: req.body.email }, function (err, user) {
          if (err) return res.status(500).send('Error on the server.');
          if (!user) return res.status(404).send('No user found.');
          var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
          if (!passwordIsValid) return res.status(401).send({ auth: false, token: null });
          var token = jwt.sign({ id: user._id, profile_id: user.profile_id }, config.secret, {
            expiresIn: 86400 // expires in 24 hours
          });
          res.status(200).send({ auth: true, token: token });
        });
      });
};
