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
   
    app.post('/run-code',(req,res) => {
        var data = {
            cpu_extra_time:"0.5",
            cpu_time_limit:"2",
            enable_per_process_and_thread_memory_limit:true,
            enable_per_process_and_thread_time_limit:false,
            language_id:req.body.langId,
            max_file_size:"1024",
            max_processes_and_or_threads:"30",
            memory_limit:"128000",
            number_of_run:"19",
            source_code:req.body.sourcecode,
            stack_limit:"64000",
            stdin:"",
            wall_time_limit:"5"
        }
        axios.defaults.headers.post['Content-Type'] = 'application/json';
        axios({
            baseURL: 'https://api.judge0.com',
            method: 'post',
            url: '/submissions?wait=true',
            data: data,
        })
        .then(function (response) {
            console.log('Response axios',response.data.stdout);
            res.send(JSON.stringify(response.data));
        })
        .catch(function (error) {
            console.log(error);
        });
    })

    // Getting the individual codesnippets
    app.get('/codes/:id', (req, res) => {
        // find id on mLab documents
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        db.collection('codes').findOne(details, (err, item) => {
            if (err) {
                res.send({'error' : 'An error occured after get request'});
            } else {
                res.send(item);
            }
        })
    });

    // Getting codes
    app.get('/codes',(req, res) => {
        // console.log('Req headers',req.headers);
        const { authorization } = req.headers;
        console.log('authorization',authorization)
        const authData = authorization.split(' ');
        const token = authData[1];
        utils.decodeToken(token,config.secret,function(err,userObj){
            if(err){
                res.send('Error occured while extracting token. User not authenticated')
            } else{
                console.log('userObj',userObj);
                const { profileId } = userObj;
                
                var user = {profile_id:userObj.profile_id};
                db.collection('codes').find(user).toArray((err,doc) => {
                    if(err){
                        console.log(err);
                    }
                    else {
                        console.log('Doc', doc);
                        res.send(doc);
                    }
                })
            }
        })
    })

    // Creating the codesnippet
    app.post('/codes', (req, res) => {
        // write parameters or json of the request here
        // create your codes here
        const { authorization } = req.headers;
        console.log('authorization',authorization)
        const authData = authorization.split(' ');
        const token = authData[1];
        utils.decodeToken(token,config.secret,function(err,userObj){
            if(err){
                res.send('Error occured while extracting token. User not authenticated')
            } else{
                console.log('Request Payload is',req.body);
                showdown.setFlavor('github');
                var content = req.body.content;
                var finalContent = null;
                if(req.body.fileType === 'single'){
                    finalContent = converter.makeHtml(content) ;
                }
                else if(req.body.fileType === 'multiple') {
                    finalContent = content.map((item) => {
                        item =  converter.makeHtml(item);
                        return item;
                     })
                }
                else{
                    res.send('Error in sending');
                }
                
                const timestamp = moment().format('L');
                const code= { name: req.body.name, content: finalContent, language:req.body.language,profile_id:userObj.profile_id,timestamp:timestamp,fileType:req.body.fileType,raw_cont:req.body.content};
                
                db.collection('codes').insert(code, (err,result) => {
                    if (err){
                        res.send({'error' : 'An error has occured'});
                    } else {
                        res.send(result.ops[0]);
                    }
                });
            }
        })
        
    });

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

    // Updating the codes
    app.put('/codes/:id', (req, res) => {
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        const code = { name: req.body.name, content: req.body.content};
        db.collection('codes').update(details, code, (err, result) => {
          if (err) {
              res.send({'error':'An error has occurred'});
          } else {
              res.send(note);
          } 
        });
    });
    
    // Deleting the codes
    app.delete('/codes/:id', (req, res) => {
        const id = req.params.id;
        const details = { '_id': new ObjectID(id) };
        db.collection('codes').remove(details, (err, item) => {
          if (err) {
            res.send({'error':'An error has occurred'});
          } else {
            res.send('Note ' + id + ' deleted!');
          } 
        });
    });
};