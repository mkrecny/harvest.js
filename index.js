var RecEngine = function(){
  this.dao = require('./lib/dao.js').create(); 
  this.compsInitialized=0,
  this.compsCompleted=0,
  this.maxHarvestSize = 10;
  this.bind('comparison:ready', this.compareUsers);
  this.bind('harvest:ready', this.harvestFromUser);
};

/*
 * Iterator to produce every 2 member subset of a set
 * @param callback : function
 */
RecEngine.prototype.compIterate = function(){
  var self = this;
  self.bind('harvest:complete', function(){
   if (self.compsCompleted==self.compsInitialized){
     self.trigger('harvest:over');
   }
  });
  this.dao.getAllUsers(function(err, users){
    var size = users.length;
    for (var u = 0; u < size; u++){
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
 * TODO: remove neightbors who are no longer relevant? - the weighted mothod alleviates this problem...
 * @param focus : varchar : uid of the focal user
 * @param comp : varchar : uid of the non-focal user
 */
RecEngine.prototype.compareUsers = function(focus, comp){
  var self = this;
  self.dao.getIntersectionSize(focus, comp, 'likes', function(err, sintersize){
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
 * 1. Get focus.all DIFF new_neighbor.likes 
 * 2. Take a small subset of that and add it to focus.all && focus.recom
 */
RecEngine.prototype.harvestFromUser = function(focus, comp, significance){ 
  var self = this;
  var numVidsToHarvest = Math.round(significance*this.maxHarvestSize);
  this.dao.srandSdiff(focus, comp, numVidsToHarvest, function(err, harvest){
    return self.dao.addToUserSet('harvest', focus, harvest, function(){
      self.compsCompleted+=1;
      self.trigger('harvest:complete', focus, comp);
    });
  });
};

/*
 * Calculates the a to b, b to a significance of the a-b intersection size
 */
RecEngine.prototype.getSignificances = function(a_all, b_all, intersection_size){
  var output = [];
  output.push(intersection_size/a_all);
  output.push(intersection_size/b_all);
  return output;
};

exports.create = function(){
  var micro = require('./lib/micro/microevent.js');
  micro.mixin(RecEngine);
  return new RecEngine();
};

