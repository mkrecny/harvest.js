var async = require('async');
var assert = require('assert');
var fs = require('fs');
/*
if (!(process.argv[2]/1 && process.argv[3]/1)){
  console.log('no arguments provided');
  console.log('usage: node recomgine.test.js [num users] [els per user]');
  process.exit();
}
*/

var Test = {
  
  start:function(callback){
    Test.startTime= new Date().getTime();
    return callback();
  },

  creation:function(callback){
    console.log('1. Inflate scripts.json:', '------------');
    var filepath = '../lib/redis-extend/scripts.json';
    Test.dao = require('../lib/dao.js').create();
    Test.dao.redis.select(8080, function(){
      Test.dao.redis.flushdb(function(){
        Test.scripts = JSON.parse(fs.readFileSync(filepath));
        assert.ok(Test.scripts, console.log("PASS"));
        return callback();
      });
    });
  },

  populateDB:function(callback){
    console.log('2. Populate DB:', '-----------------');
    Test.dao.populate(10, 10);
    Test.dao.bind('populated', function(){
      assert.ok(true, console.log('PASS'));
      return callback();
    });
  },

  
  end:function(callback){
    var endTime = new Date().getTime(); 
    var timeTaken = endTime-Test.startTime;
    console.log('TEST COMPLETED-----------------');
    console.log('EXECUTION TIME:', timeTaken+'ms');
    process.exit();
 }
};

var tests = [];

for (var i in Test) {
  if (Test.hasOwnProperty(i) && typeof Test[i]==='function'){
    tests.push(Test[i]);  
  }
}

async.series(tests);
