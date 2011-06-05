var config = require('../config.js');

var DAO = function DAO() {
  this.redis = require('./evredis').createClient(config.redis.port, config.redis.host);
  require('./redis-extend/clients/redis-extend.js').create().extend(this.redis);
  this.redis.select(config.redis.db);
};

DAO.prototype.userSetKey = 'users:all';

/*
 * Randomly populate a test DB: ONLY EVER CALLED BY THE UNIT TEST
 * @param numUsers : int : number of users in the universe of discourse 
 * @param elsPerUser : int : number of likes per user
 */
DAO.prototype.populate = function(numUsers, elsPerUser, subject){
  var self = this;
  var usersAdded = 0;
  for (var u = 1; u < numUsers+1; u++){
      this.addUser(u);
    for (var l = 0; l<elsPerUser; l++){
      this.addToUserSet('all', u, [Math.floor(Math.floor(Math.random()*21))], function(){});
    }
    this.srandSubStore(this.getUserPropertyKey(u, 'all'), this.getUserPropertyKey(u, subject), Math.round(elsPerUser/3), function(){
      usersAdded+=1;
      if (usersAdded==numUsers) return self.trigger('populated');
     });
  }
};

/*
 * Add an array of elements to a user property set
 * @param property : string : user property that set represents e.g. 'likes' 
 * @param user : varchar : unique user id
 * @param members : array : members to add to user set
 */
DAO.prototype.addToUserSet = function(property, user, members, callback){
  var key = this.getUserPropertyKey(user, property);
  this.redis.sadd(key, members, callback);
};

/*
 * Add users to users:all
 * @param user : varchar : uid of user to add
 */
DAO.prototype.addUser = function(user, callback){
  return callback ? callback(this.redis.sadd(this.userSetKey, user)) : this.redis.sadd(this.userSetKey, user);     
};

/*
 * Get the set key for a user property
 * @param user : varchar : uid of user
 * @param property : string : user property that set represents
 */
DAO.prototype.getUserPropertyKey = function(user, property){
  return 'u:'+user+':'+property;  
};

/*
 * Return all users in universe of discourse
 * @param callback : function 
 */
DAO.prototype.getAllUsers = function(callback){  
  return this.redis.smembers(this.userSetKey, callback);
};

/*
 * Get the intersection size of two sets
 * @param a_key : string : key of the first set
 * @param b_key : string : key of the second set
 * @param callback : function
 */
DAO.prototype.getIntersectionSize = function(a_key, b_key, callback){
  return this.redis.sopscard([a_key, b_key], ['sinter'], callback);
};

/*
 * Get a random subset of a difference between two sets
 * @param a_key : string : the key of the first set
 * @param b_key : string : the key of the second set
 * @param num_rand_els : int : the size of the random subset
 */
DAO.prototype.srandSdiff = function(a_key, b_key, num_rand_els, callback){
  return this.redis.sopsrandsubset([a_key, b_key], ['sdiff', num_rand_els], callback);
};


/*
 * TODO: Migrate to redis-extend
 * Take a random subset of a set and store it elsewhere
 * @param src_key : string : the key of the set from which the subset will derive
 * @param dst_key : string : the key of the subset to be formed
 * @param subset_size : int : the desired size of the subset
 * @param callback : function
 */
DAO.prototype.srandSubStore = function(src_key, dst_key, subset_size, callback){
  this.redis.sopsrandsubstore([src_key], ['smembers', subset_size, dst_key], callback);
};

/*
 * Get the cardinality of the union of set at a_key and set at b_key
 * @param a_key : string : key for set a
 * @param b_key : string : key for set b
 */ 
DAO.prototype.sunionScard = function(a_key, b_key, callback){
  return this.redis.sopscard([a_key, b_key], ['sunion'], callback);
};

/*
 * Get the size of a user property set
 * @param user : varchar : the uid of the user
 * @param property : string : the property the set represents
 * @param callback : function
 */
DAO.prototype.getUserSetSize = function(user, property, callback){
  var key = this.getUserPropertyKey(user, property);
  return this.redis.scard(key, callback);
};

DAO.prototype.patternOp = function(pattern, operation, callback){
  this.redis.patternop([], ['u:*:likes', 'del'], callback);
};

exports.create = function(){
  var micro = require('./micro/microevent.js');
  micro.mixin(DAO);
  return new DAO();
};

