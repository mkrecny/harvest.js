var HarvestStats = function(subject){
  this.subject = subject;
  this.dao = require('./dao.js').create();
};


HarvestStats.prototype.getUserCount = function(){
  this.dao.redis.scard('users:all', function(err, res){
    console.log('USER COUNT', res);
  });
};

HarvestStats.prototype.printUserLikes = function(){
  var self = this;
  this.dao.redis.smembers('users:all', function(err, users){
    users.forEach(function(u){
      self.dao.redis.scard(self.dao.getUserPropertyKey(u, self.subject), function(err, card){
        console.log(u, card);
      });
    });
  });
};

var hs = new HarvestStats('likes');
//hs.getUserCount();
hs.printUserLikes();
