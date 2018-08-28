const showdown = require('showdown'),
    converter = new showdown.Converter();
showdown.setFlavor('github');
const uuidv4 = require('uuid/v4');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/index');

// Mongoose config
const mongoose = require('mongoose');
let dev_db_url = 'mongodb://mz7:mlab7771@ds261828.mlab.com:61828/code-snippet-manager';
const mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;

function signup(req, res) {
    let hashedPassword = bcrypt.hashSync(req.body.password, 8);
    let profile_id = uuidv4();
    const user = {
        name: req.body.name,
        email: req.body.email,
        profile_id: profile_id,
        password: hashedPassword
    };
    db
        .collection('users')
        .insert(user, (err, result) => {
            if (err) {
                console.log('Error in if ');
                res.send({'error': 'An error has occured'});
            } else {
                res.send(result.ops[0]);
            }
        })
}

function login(req, res) {
    db
        .collection('users')
        .findOne({
            email: req.body.email
        }, function (err, user) {
            if (err) 
                return res.status(500).send('Error on the server.');
            if (!user) 
                return res.status(404).send('No user found.');
            const passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
            if (!passwordIsValid) 
                return res.status(401).send({auth: false, token: null});
            let token = jwt.sign({
                id: user._id,
                profile_id: user.profile_id
            }, config.secret, {
                expiresIn: 86400 // expires in 24 hours
            });
            res
                .status(200)
                .send({auth: true, token: token});
        });
}

module.exports = {
    signup,
    login
};
