var async = require('async');
var assert = require('assert');
var Harvest = require('./harvest.js');

var FilterSession = function(){
  var self = this;
  this.stats = {};
  this.stats.harvests = 0;
  this.stats.significances = {};
  this.stats.intersections = {};
  this.harvest = Harvest.create('likes', 0.6); 
  this.harvest.bind('harvest:complete', function(focus, comp, num){
    self.stats.harvests += num;
  });
  this.harvest.bind('harvest:over', function(){self.end()});
  this.harvest.bind('harvest:ready', function(focus, comp, sig){
    self.stats.significances[focus+' -> '+comp] = sig;
  });
  this.harvest.bind('harvest:intersection', function(focus, comp, sintersize){
    self.stats.intersections[focus+' N '+comp] = sintersize;
  });
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
//  console.log('SIGNIFICANCES:', this.stats.significances);
//  console.log('INTERSECTIONS:', this.stats.intersections);
  console.log('HARVESTS:', this.stats.harvests);
  console.log('COMPARISONS:', this.stats.numComparisons);
  console.log('EXECUTION TIME:', this.stats.timeTaken+' ms');
  console.log('EXECUTION RATE:', Math.round((this.stats.numComparisons/this.stats.timeTaken)*100)/100+' comps/ms'); 
  console.log('====================================');
  process.exit();
};

exports.create = function(){
  return new FilterSession();
};
