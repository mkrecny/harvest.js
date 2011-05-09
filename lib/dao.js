var DAO = function DAO() {
  this.redis = require('./evredis').createClient();
}

DAO.prototype.userSetKey = 'users:all';

/*
 * Randomly populate a test DB: ONLY EVER CALLED BY THE UNIT TEST
 * TODO: have likes be a subset of all
 * @param numUsers : int : number of users in the universe of discourse 
 * @param elsPerUser : int : number of likes per user
 */
DAO.prototype.populate = function(numUsers, elsPerUser){
  var self = this;
  var usersAdded = 0;
  for (var u = 1; u < numUsers+1; u++){
//    var user = Math.floor(Math.floor(Math.random()*5000));
//    this.addUser(user);
      this.addUser(u);
    for (var l = 0; l<elsPerUser; l++){
      this.addToUserSet('likes', u, [Math.floor(Math.floor(Math.random()*21))], function(){
        usersAdded+=1;
        if (usersAdded==numUsers) return self.trigger('populated');
      });
    }
  }
};

/*
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

DAO.prototype.addUser = function(user){
  this.redis.sadd(this.userSetKey, user);    
};

DAO.prototype.getUserPropertyKey = function(user, property){
  return 'u:'+user+':'+property;  
};

DAO.prototype.getAllUsers = function(callback){  
  return this.redis.smembers(this.userSetKey, callback);
};

DAO.prototype.getIntersectionSize = function(a, b, property, callback){
  var script = 
  'local inter = redis("sinter", KEYS[1], KEYS[2]); return table.getn(inter)';
  return this.redis.eval(script, 2, this.getUserPropertyKey(a, 'likes'), this.getUserPropertyKey(b, 'likes'), callback); 
};

DAO.prototype.srandSdiff = function(a, b, num_rand_els, callback){
  var script = 'local diff = redis("sdiff", KEYS[1], KEYS[2]); local req_max = tonumber(ARGV[1]); local max;if req_max > table.getn(diff) then max = table.getn(diff) else max = req_max end;local output = {}; for i=0, max-1 do table.insert(output, table.remove(diff)) end; return output';
  return this.redis.eval(script, 2, this.getUserPropertyKey(a, 'likes'), this.getUserPropertyKey(b, 'likes'), num_rand_els, callback);
};

DAO.prototype.getUserSetSize = function(user, property, callback){
  var key = this.getUserPropertyKey(user, property);
  return this.redis.scard(key, callback);
};

exports.create = function(){
  var micro = require('./micro/microevent.js');
  micro.mixin(DAO);
  return new DAO();
};
