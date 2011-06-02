/*
 * Some documentation needed here
 * @param : subject : string : the name of the user element the harvest concerns (e.g: 'movies_liked') 
 */
var Harvest = function(subject, threshold){
  this.subject = subject; 
  this.dao = require('./dao.js').create(); 
  this.compsInitialized = 0;
  this.compsCompleted = 0;
  this.maxHarvestSize = 10;
  this.threshold = threshold;
  this.bind('comparison:ready', this.compareUsers);
  this.bind('harvest:ready', this.harvestFromUser);
};

/*
 * Iterator to produce every 2 member subset of a set
 * Triggers a comparison:ready for each 2 member subset
 */
Harvest.prototype.compIterate = function(){
  var self = this;
  self.bind('harvest:complete', function(){
   if (self.compsCompleted==self.compsInitialized){
     self.trigger('harvest:over');
   }
  });
  
  this.dao.getAllUsers(function(err, users){
    if (typeof users == undefined || users.length < 2) return self.trigger('harvest:over');
    self.userbase_size = users.length;
    for (var u = 0; u < self.userbase_size; u++){
      var focus = users.shift();
      var remaining_size = users.length;
      for (var c = 0; c < remaining_size; c++){
        self.compsInitialized+=2; //2 because each comparison has 2 parts
        self.trigger('comparison:ready', focus, users[c]); 
      }
    }
  });    
};

/*
 * Compares two users and initiates harvest if necessary 
 * @param focus : varchar : uid of the focal user
 * @param comp : varchar : uid of the non-focal user
 */
Harvest.prototype.compareUsers = function(focus, comp){
  var self = this;
  self.dao.getIntersectionSize(this.dao.getUserPropertyKey(focus, self.subject), this.dao.getUserPropertyKey(comp, self.subject), function(err, sintersize){
   self.trigger('harvest:intersection', focus, comp, sintersize);
   var focus_key = self.dao.getUserPropertyKey(focus, 'all');
   var comp_key = self.dao.getUserPropertyKey(comp, 'all');
   self.dao.sunionScard(focus_key, comp_key, function(err, sunionsize){
     var significance = sintersize/sunionsize;
     if (significance > self.threshold){
       self.trigger('harvest:ready', focus, comp, significance);
       self.trigger('harvest:ready', comp, focus, significance);
     } else {
       self.compsCompleted+=2;
       self.trigger('harvest:complete', null, null, 0);
     }
   });
  });
};

/*
 * Harvests elements from comp to focus based on significance
 * @param focus : varchar : uid of focus
 * @param comp : varchar : uid of comp
 * @param significance : float : significance of comp to focus 0 <= n <= 1
 * //TODO: make 'all' relative to subect eg: u:x:subject:all
 */
Harvest.prototype.harvestFromUser = function(focus, comp, significance){ 
  var self = this;
  var numElsToHarvest = Math.round(significance*this.maxHarvestSize);
  this.dao.srandSdiff(this.dao.getUserPropertyKey(focus, 'all'), this.dao.getUserPropertyKey(comp, self.subject), numElsToHarvest, function(err, harvest){
    self.dao.addToUserSet('all', focus, harvest, function(){
      self.dao.addToUserSet('harvest', focus, harvest, function(err, res){
        self.compsCompleted+=1;
        return self.trigger('harvest:complete', focus, comp, res);
      });
    });
  });
};

/*
 * Add a user to the harvest
 * @param user : varchar : uid of the user
 * TODO: this is untested
 */
Harvest.prototype.addUser = function(user, callback){
  return this.dao.addUser(user, callback);
};

/*
 * Add a user element to the subject set
 * @param user : varchar : uid of the user
 * TODO: this is untested
 */
Harvest.prototype.addUserElement = function(user, members,  callback){
  var self = this;
  members = Array.isArray(members) ? members : [members];
  return this.dao.addToUserSet(self.subject, user, members, callback);
};

exports.create = function(subject, threshold){
  var micro = require('./micro/microevent.js');
  micro.mixin(Harvest);
  return new Harvest(subject, threshold);
};

