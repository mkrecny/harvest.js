var async = require('async');
var assert = require('assert');
var Recomgine = require('./harvest.js');

var FilterSession = function(){
  var self = this;
  this.stats = {};
  this.harvest = Recomgine.create(); 
  this.harvest.bind('harvest:over', function(){self.end()});
};

FilterSession.prototype.start = function(){
  console.log('===========STARTING NEW HARVEST===========');
  console.log('may take a while for large datasets........');
  console.log('==========================================');
  this.stats.startTime = new Date().getTime();
  this.harvest.compIterate();
};

FilterSession.prototype.end = function(){
  this.stats.endTime = new Date().getTime(); 
  this.stats.timeTaken = this.stats.endTime-this.stats.startTime;
  this.stats.numComparisons = this.harvest.compsCompleted/2;
  console.log('===================================');
  console.log('HARVEST COMPLETED');
  console.log('===================================');
  console.log('USER BASE:', this.harvest.userbase_size);
  console.log('COMPARISONS:', this.stats.numComparisons);
  console.log('EXECUTION TIME:', this.stats.timeTaken+' ms');
  console.log('EXECUTION RATE:', Math.round((this.stats.numComparisons/this.stats.timeTaken)*100)/100+' comps/ms'); 
  console.log('====================================');
  process.exit();
};

exports.create = function(){
  return new FilterSession();
};
