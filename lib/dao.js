var DAO = function DAO() {
  this.redis = require('./evredis').createClient();
}

DAO.prototype.userSetKey = 'users:all';

/*
 * Randomly populate a test DB: ONLY EVER CALLED BY THE UNIT TEST
 * @param numUsers : int : number of users in the universe of discourse 
 * @param elsPerUser : int : number of likes per user
 */
DAO.prototype.populate = function(numUsers, elsPerUser){
  var self = this;
  var usersAdded = 0;
  for (var u = 1; u < numUsers+1; u++){
      this.addUser(u);
    for (var l = 0; l<elsPerUser; l++){
      this.addToUserSet('all', u, [Math.floor(Math.floor(Math.random()*21))], function(){});
    }
    this.srandSubStore(this.getUserPropertyKey(u, 'all'), this.getUserPropertyKey(u, 'likes'), Math.round(elsPerUser/3), function(){
      usersAdded+=1;
      if (usersAdded==numUsers) return self.trigger('populated');
     });

  }
};

/*
 * Add an array of elements to a user property set
 * TODO: write a lua script for SADDMULTI 
 * @param property : string : user property that set represents e.g. 'likes' 
 * @param user : varchar : unique user id
 * @param members : array : members to add to user set
 */
DAO.prototype.addToUserSet = function(property, user, members, callback){
  if (!members.length){
    return callback();
  }
  var self = this;
  var key = this.getUserPropertyKey(user, property);
  this.redis.sadd(key, members.shift(), function(){
    self.addToUserSet(property, user, members, callback); 
  });
};

/*
 * Add users to users:all
 * @param user : varchar : uid of user to add
 */
DAO.prototype.addUser = function(user){
  this.redis.sadd(this.userSetKey, user);    
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
  var script = 
  'local inter = redis("sinter", KEYS[1], KEYS[2]); return table.getn(inter)';
  return this.redis.eval(script, 2, a_key, b_key, callback); 
};

/*
 * Get a random subset of a difference between two sets
 * @param a_key : string : the key of the first set
 * @param b_key : string : the key of the second set
 * @param num_rand_els : int : the size of the random subset
 */
DAO.prototype.srandSdiff = function(a_key, b_key, num_rand_els, callback){
  var script = 'local diff = redis("sdiff", KEYS[1], KEYS[2]); local req_max = tonumber(ARGV[1]); local max;if req_max > table.getn(diff) then max = table.getn(diff) else max = req_max end;local output = {}; for i=0, max-1 do table.insert(output, table.remove(diff)) end; return output';
  return this.redis.eval(script, 2, a_key, b_key, num_rand_els, callback);
};


/*
 * Take a random subset of a set and store it elsewhere
 * @param src_key : string : the key of the set from which the subset will derive
 * @param dst_key : string : the key of the subset to be formed
 * @param subset_size : int : the desired size of the subset
 * @param callback : function
 */
DAO.prototype.srandSubStore = function(src_key, dst_key, subset_size, callback){
  var script = 'local subset_size = tonumber(ARGV[1]); for i=0, subset_size-1 do redis("sadd", KEYS[2], redis("srandmember", KEYS[1])) end return {ok="OK"}';
  return this.redis.eval(script, 2, src_key, dst_key, subset_size, callback);
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

exports.create = function(){
  var micro = require('./micro/microevent.js');
  micro.mixin(DAO);
  return new DAO();
};

