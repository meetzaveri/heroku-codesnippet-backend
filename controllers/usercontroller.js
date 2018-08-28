const ObjectID = require('mongodb').ObjectID;
const showdown = require('showdown'),
    converter = new showdown.Converter();
showdown.setFlavor('github');
const axios = require('axios');
const utils = require('../utils/utils');
const config = require('../config/index');
const moment = require('moment');
const vanillaAsync = require('vanilla-async');

// Mongoose config
const mongoose = require('mongoose');
let dev_db_url = 'mongodb://mz7:mlab7771@ds261828.mlab.com:61828/code-snippet-manager';
const mongoDB = process.env.MONGODB_URI || dev_db_url;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
const db = mongoose.connection;

function runCodeSnippet(req, res) {
    let data = {
        cpu_extra_time: "0.5",
        cpu_time_limit: "2",
        enable_per_process_and_thread_memory_limit: true,
        enable_per_process_and_thread_time_limit: false,
        language_id: req.body.langId,
        max_file_size: "1024",
        max_processes_and_or_threads: "30",
        memory_limit: "128000",
        number_of_run: "19",
        source_code: req.body.sourcecode,
        stack_limit: "64000",
        stdin: "",
        wall_time_limit: "5"
    }
    axios.defaults.headers.post['Content-Type'] = 'application/json';
    axios({baseURL: 'https://api.judge0.com', method: 'post', url: '/submissions?wait=true', data: data}).then(function (response) {
        // console.log('Response axios', response.data.stdout);
        res.send(JSON.stringify(response.data));
    })
        .catch(function (error) {
            console.log(error);
        });
}

function getCodeSnippet(req, res) {
    // find id on mLab documents
    const id = req.params.id;
    const details = {
        '_id': new ObjectID(id)
    };
    db
        .collection('codes')
        .findOne(details, (err, item) => {
            if (err) {
                res.send({'error': 'An error occured after get request'});
            } else {
                res.send(item);
            }
        })
}

function getAllCodeSnippets(req, res) {
    console.log('Req headers', req.headers);
    const {authorization} = req.headers;
    console.log('authorization', authorization)
    const authData = authorization.split(' ');
    const token = authData[1];
    utils.decodeToken(token, config.secret, function (err, userObj) {
        if (err) {
            res.send('Error occured while extracting token. User not authenticated')
        } else {
            console.log('userObj', userObj);
            const {profileId} = userObj;

            const user = {
                profile_id: userObj.profile_id
            };
            db
                .collection('codes')
                .find(user)
                .toArray((err, doc) => {
                    if (err) {
                        console.log(err);
                    } else {
                        // console.log('Doc', doc);
                        res.send(doc);
                    }
                })
        }
    })
}

function postCodeSnippet(req, res) {
    // write parameters or json of the request here create your codes here
    const {authorization} = req.headers;
    // console.log('authorization', authorization);
    const authData = authorization.split(' ');
    const token = authData[1];
    utils.decodeToken(token, config.secret, function (err, userObj) {
        if (err) {
            res.send('Error occured while extracting token. User not authenticated')
        } else {
            console.log('Request Payload is', req.body);
            showdown.setFlavor('github');
            let content = req.body.content;
            let finalContent = null;
            if (req.body.fileType === 'markdown') {
                finalContent = converter.makeHtml(content);
            } else if (req.body.fileType === 'multiple') {
                finalContent = content.map((item) => {
                    item = converter.makeHtml(item);
                    return item;
                })
            } else if (req.body.fileType === 'textnote') {
                finalContent = content;
            } else {
                res.send('Error in sending');
            }

            const timestamp = moment().format('L');
            const code = {
                name: req.body.name,
                content: finalContent,
                language: req.body.language,
                profile_id: userObj.profile_id,
                timestamp: timestamp,
                fileType: req.body.fileType,
                raw_cont: req.body.content
            };

            db
                .collection('codes')
                .insert(code, (err, result) => {
                    if (err) {
                        res.send({'error': 'An error has occured'});
                    } else {
                        res.send(result.ops[0]);
                    }
                });
        }
    })
}

function updateCodeSnippet(req, res) {
    const {authorization} = req.headers;
    // console.log('authorization', authorization);
    const authData = authorization.split(' ');
    const token = authData[1];
    utils.decodeToken(token, config.secret, function (err, userObj) {
        if (err) {
            res.send('Error occured while extracting token. User not authenticated')
        } else {
            const id = req.params.id;
            const details = {
                '_id': new ObjectID(id),
                'profile_id': userObj.profile_id
            };
            const content = req.body.content;
            let finalContent = null;
            if (req.body.fileType === 'markdown') {
                finalContent = converter.makeHtml(content);
            } else if (req.body.fileType === 'multiple') {
                finalContent = content.map((item) => {
                    item = converter.makeHtml(item);
                    return item;
                })
            } else if (req.body.fileType === 'textnote') {
                finalContent = content;
            } else {
                res.send('Error in sending');
            }

            const code = {
                name: req.body.name,
                content: finalContent
            };

            // Using waterfall to perform dependent tasks and passing data on to next
            // functions
            vanillaAsync.waterfall([
                function (callback) {
                    console.log('INTO VANILLA ASYNC')
                    db
                        .collection('codes')
                        .findOne(details, (err, item) => {
                            if (err) {
                                let error = {
                                    'error': 'An error occured after get request'
                                }
                                callback(error, null);
                            } else {
                                callback(null, item);
                            }
                        })
                },
                function (item, callback) {
                    const content = Object.assign(item, code);
                    db
                        .collection('codes')
                        .update(details, content, (err, result) => {
                            if (err) {
                                let error = {
                                    'error': 'An error has occurred in PUT operation'
                                };
                                callback(error, null);
                            } else {
                                console.log('RE$ULT', result);
                                callback(null, {message: "Successfully updated"})
                            }
                        });
                }
            ], function (err, results) {
                if (err) {
                    res.send('Error in updating snippet');
                } else {
                    console.log('DONE');
                    res.send(results)
                }
            })
        }
    })
}

function deleteCodeSnippet(req, res) {
    const {authorization} = req.headers;
    // console.log('authorization', authorization);
    const authData = authorization.split(' ');
    const token = authData[1];
    utils.decodeToken(token, config.secret, function (err, userObj) {
        if (err) {
            res.send('Error occured while extracting token. User not authenticated')
        } else {
            const id = req.params.id;
            const details = {
                '_id': new ObjectID(id),
                'profile_id': userObj.profile_id
            };
            db
                .collection('codes')
                .remove(details, (err, item) => {
                    if (err) {
                        res.send({'error': 'An error has occurred'});
                    } else {
                        res.send('Snippet ' + id + ' deleted!');
                    }
                });
        }
    })

}
module.exports = {
    runCodeSnippet,
    deleteCodeSnippet,
    updateCodeSnippet,
    postCodeSnippet,
    getAllCodeSnippets,
    getCodeSnippet
};
