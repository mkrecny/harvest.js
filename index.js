var RecEngine = function(){
  this.dao = require('./lib/dao.js').create(); 
  this.significanceThreshold = 0.3;
  this.harvestSize = 2;
};

/*
 * Iterator to produce every 2 member subset of a set
 */
RecEngine.prototype.compIterate = function(callback){
  var self = this;
  this.dao.getAllUsers(function(err, users){
    var size = users.length;
    for (var u = 0; u < size; u++){
      var focus = users.shift();
      var remaining_size = users.length;
      for (var c = 0; c < remaining_size; c++){
        self.compareUsers(focus, users[c]);
      }
    }
    return callback();
  });    
};

/*
 * Grabs all of the state needed and then calls a function that can act on that 
 * state synchronously
 */
RecEngine.prototype.compareUsers = function(focus, comp){
  console.log(focus, comp);
  var self = this;
  self.dao.getIntersectionSize(focus, comp, 'likes', function(err, sintersize){
   self.dao.getUserSetSize(focus, 'likes', function(err, focus_size){
     self.dao.getUserSetSize(comp, 'likes', function(err, comp_size){
       var significances = self.getSignificances(focus_size, comp_size, sintersize);
       console.log(significances);
       if (significances[0]>self.significanceThreshold){
         //self.addNeighbor(focus, comp);
         self.harvestFromNeighbor(focus, comp);
       }
       if (significances[1]>self.significanceThreshold){
         //self.addNeighbor(comp, focus);
         self.harvestFromNeighbor(comp, focus);
       }
       return;
     });
   });
  });
};

/*
 * 1. Get focus.all DIFF new_neighbor.likes 
 * 2. Take a small subset of that and add it to focus.all && focus.recom
 */
RecEngine.prototype.harvestFromNeighbor = function(focus, new_neighbor){ 
  var self = this;
  this.dao.srandSdiff(focus, new_neighbor, self.harvestSize, function(err, harvest){
    return self.dao.addToUserSet('harvest', focus, harvest);
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

