var DAO = function DAO() {
  this.redis = require('./evredis').createClient();
}

DAO.prototype.userSetKey = 'users:all';

/*
 * Populate a test DB
 * TODO: have likes be a subset of all
 */
DAO.prototype.populate = function(numUsers, elsPerUser){
  for (var u = 1; u < numUsers+1; u++){
    var user = Math.floor(Math.floor(Math.random()*5000));
    for (var l = 0; l<elsPerUser; l++){
      this.addUserLike(user, Math.floor(Math.floor(Math.random()*21)));
    }
  }
};

/*
 * TODO: make generic w/ addToUserSet
 */
DAO.prototype.addUserLike = function(user, likedEl){
  var key = this.getUserPropertyKey(user, 'likes');
  this.redis.sadd(key, likedEl);
  this.addUser(user);
};

/*
 * TODO: write a lua script for this cmd
 */
DAO.prototype.addToUserSet = function(property, user, harvest){
  if (!harvest.length) return;
  var self = this;
  var key = this.getUserPropertyKey(user, property);
  this.redis.sadd(key, harvest.shift(), function(){
    return self.addToUserSet(property, user, harvest); 
  });
}

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
}


exports.create = function(){
  var micro = require('./micro/microevent.js');
  micro.mixin(DAO);
  return new DAO();
};




