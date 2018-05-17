var crypto = require('crypto');
var jwt = require('jsonwebtoken');

exports.verifyPassword = function(password, salt){
  var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
  hash.update(password);
  var value = hash.digest('hex');
  return value;
};


exports.generateToken = function(dataItem,SECRET_KEY){
  return jwt.sign({ email: dataItem.email, profileId: dataItem.profileId, userId: dataItem.id, organization: dataItem.organization }, SECRET_KEY);
}

// For decoding token and extracting various data
exports.decodeToken = function decodeToken(token, secretKey, cb){
  jwt.verify(token, secretKey, function(err, decoded) {
    cb(err,decoded);
  });
}