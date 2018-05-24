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
const async = require('async');

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
                if(req.body.fileType === 'markdown'){
                    finalContent = converter.makeHtml(content) ;
                }
                else if(req.body.fileType === 'multiple' ) {
                    finalContent = content.map((item) => {
                        item =  converter.makeHtml(item);
                        return item;
                     })
                }
                else if(req.body.fileType === 'textnote'){
                    finalContent = content;
                }
                else {
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

    // Updating the codes
    app.put('/codes/:id', (req, res) => {
        const { authorization } = req.headers;
        console.log('authorization',authorization)
        const authData = authorization.split(' ');
        const token = authData[1];
        utils.decodeToken(token,config.secret,function(err,userObj){
            if(err){
                res.send('Error occured while extracting token. User not authenticated')
            } else {
                const id = req.params.id;
                const details = { '_id': new ObjectID(id),'profile_id':userObj.profile_id  };
                const code = { name: req.body.name, content: req.body.content, };

                async.waterfall([
                    function(callback){
                        db.collection('codes').findOne(details, (err, item) => {
                            if (err) {
                                var err = {'error' : 'An error occured after get request'}
                                callback(err,null);
                            } else {
                                callback(null,item);
                            }
                        })
                    },
                    function(item,callback){
                        const content = Object.assign(item,code);
                        db.collection('codes').update(details, content, (err, result) => {
                            if (err) {
                                var err = {'error':'An error has occurred in PUT operation'};
                                callback(err,null);
                            } else {
                                console.log('RE$ULT',result);
                                callback(null,{message:"Successfully updated"})
                            } 
                        });
                    }
                ],function(err,results){
                    if(err) {
                        res.send('Error in updating snippet');
                    } else {
                        res.send(results)
                    }
                })
            } 
        })
        
    });
    
    // Deleting the codes
    app.delete('/codes/:id', (req, res) => {
        const { authorization } = req.headers;
        console.log('authorization',authorization)
        const authData = authorization.split(' ');
        const token = authData[1];
        utils.decodeToken(token,config.secret,function(err,userObj){
            if(err){
                res.send('Error occured while extracting token. User not authenticated')
            } else{
                const id = req.params.id;
                const details = { '_id': new ObjectID(id),'profile_id':userObj.profile_id };
                db.collection('codes').remove(details, (err, item) => {
                if (err) {
                    res.send({'error':'An error has occurred'});
                } else {
                    res.send('Snippet ' + id + ' deleted!');
                } 
                });
            }
        })
        
    });
};
