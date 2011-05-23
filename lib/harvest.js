var Harvest = function(){
  this.dao = require('./dao.js').create(); 
  this.compsInitialized = 0,
  this.compsCompleted = 0,
  this.maxHarvestSize = 10;
  this.bind('comparison:ready', this.compareUsers);
  this.bind('harvest:ready', this.harvestFromUser);
};

/*
 * Iterator to produce every 2 member subset of a set
 */
Harvest.prototype.compIterate = function(){
  var self = this;
  self.bind('harvest:complete', function(){
   if (self.compsCompleted==self.compsInitialized){
     self.trigger('harvest:over');
   }
  });
  
  this.dao.getAllUsers(function(err, users){
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
  self.dao.getIntersectionSize(this.dao.getUserPropertyKey(focus, 'likes'), this.dao.getUserPropertyKey(comp, 'likes'), function(err, sintersize){
   self.dao.getUserSetSize(focus, 'likes', function(err, focus_size){
     self.dao.getUserSetSize(comp, 'likes', function(err, comp_size){
       var significances = self.getSignificances(focus_size, comp_size, sintersize);
       self.trigger('harvest:ready', focus, comp, significances[0]);
       self.trigger('harvest:ready', comp, focus, significances[1]);
     });
   });
  });
};

/*
 * Harvests elements from comp to focus based on significance
 * @param focus : varchar : uid of focus
 * @param comp : varchar : uid of comp
 * @param significance : float : significance of comp to focus 0 <= n <= 1
 */
Harvest.prototype.harvestFromUser = function(focus, comp, significance){ 
  var self = this;
  var numVidsToHarvest = Math.round(significance*this.maxHarvestSize);
  this.dao.srandSdiff(this.dao.getUserPropertyKey(focus, 'all'), this.dao.getUserPropertyKey(comp, 'likes'), numVidsToHarvest, function(err, harvest){
    return self.dao.addToUserSet('harvest', focus, harvest, function(){
      self.compsCompleted+=1;
      self.trigger('harvest:complete', focus, comp);
    });
  });
};

/*
 * Calculates the a to b, b to a significance of the a-b intersection size
 * @param a_all : int : set cardinality for a all set
 * @param b_all : int : set cardinality for b all set
 * @param intersection_size : int : set cardinlity for a - b (likes)
 */
Harvest.prototype.getSignificances = function(a_all, b_all, intersection_size){
  var output = [];
  output.push(intersection_size/a_all);
  output.push(intersection_size/b_all);
  return output;
};

exports.create = function(){
  var micro = require('./micro/microevent.js');
  micro.mixin(Harvest);
  return new Harvest();
};

