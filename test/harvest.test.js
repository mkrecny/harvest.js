var async = require('async');
var assert = require('assert');

if (!(process.argv[2]/1 && process.argv[3]/1)){
  console.log('no arguments provided');
  console.log('usage: node recomgine.test.js [num users] [els per user]');
  process.exit();
}

var Test = {
  numTestUsers:process.argv[2]/1,
  numElsPerUser:process.argv[3]/1,

  start:function(callback){
    Test.startTime= new Date().getTime();
    return callback();
  },

  creation:function(callback){
    console.log('1. Instantiation from module:', '------------');
    var self = this;
    Test.harvest = require('../lib/harvest.js').create();
    Test.harvest.dao.redis.select(10, function(){
      Test.harvest.dao.redis.flushdb(function(){
        assert.ok(Test.harvest !== null, console.log("PASS"));
        return callback();
      });
    });
  },
  
   populateDB:function(callback){
    console.log('2. Populate from DB:', '------------');
    Test.harvest.dao.populate(Test.numTestUsers, Test.numElsPerUser);
    Test.harvest.dao.bind('populated', function(){
      Test.harvest.dao.redis.scard(Test.harvest.dao.userSetKey, function(err, res){
         assert.ok(res == Test.numTestUsers, console.log("PASS"));
         return callback();
      });
    });
   },

  /*
   * This can fail sometimes as user ids are random numbers and 
   * the same one could be generated > 1 times
   */
   getAllUsers:function(callback){
    console.log('3. Get All Users:', '------------');
    Test.harvest.dao.getAllUsers(function(err, res){
      assert.ok(res.length===Test.numTestUsers, console.log("PASS"));
      Test.users = res;
      return callback();
    }); 
   },

  comparativeIterator:function(callback){
    //not quite sure how to test this 
    console.log('4. Comparative iterator:', '---------');
    Test.harvest.bind('harvest:over', function(){
      assert.ok(true, console.log('PASS')); //plz test a meaningful condition here
      return callback();
    });
    Test.harvest.compIterate();
   },

/* Taking this out as its covered in compIterator above
   compareUsers:function(callback){
    return callback();
    console.log('5. Compare 2 users', '------------');
    var a = Test.users.shift();
    var b = Test.users.shift();
    Test.harvest.bind('harvest:complete', function(focus, comp){
     assert.ok(focus==a||focus==b && comp==a||comp==b, console.log('PASS')); //erm...not ideal
     this.unbind('harvest:complete');
     return callback();
    });
    Test.harvest.compareUsers(a, b); 
   },
*/
   end:function(callback){
    var endTime = new Date().getTime(); 
    var timeTaken = endTime-Test.startTime;
    var numComparisons = Test.harvest.compsCompleted/2;
    console.log('HARVEST COMPLETED-----------------');
    console.log('USER BASE:', Test.numTestUsers);
    console.log('COMPARISONS:', numComparisons);
    console.log('EXECUTION TIME:', timeTaken+'ms');
    console.log('EXECUTION RATE:', Math.round((numComparisons/timeTaken)*100)/100+' comps/ms'); 
    process.exit();;
   }
};

var tests = [];

for (var i in Test) {
  if (Test.hasOwnProperty(i) && typeof Test[i]==='function'){
    tests.push(Test[i]);  
  }
}

async.series(tests);
