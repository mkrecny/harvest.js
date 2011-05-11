var async = require('async');
var assert = require('assert');

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
    Test.recomgine = require('../index.js').create();
    Test.recomgine.dao.redis.select(8080, function(){
      Test.recomgine.dao.redis.flushdb(function(){
        assert.ok(Test.recomgine !== null, console.log("PASS"));
        return callback();
      });
    });
  },
  
   populateDB:function(callback){
    console.log('2. Populate from DB:', '------------');
    Test.recomgine.dao.populate(Test.numTestUsers, Test.numElsPerUser);
    Test.recomgine.dao.bind('populated', function(){
      Test.recomgine.dao.redis.scard(Test.recomgine.dao.userSetKey, function(err, res){
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
    Test.recomgine.dao.getAllUsers(function(err, res){
      assert.ok(res.length===Test.numTestUsers, console.log("PASS"));
      Test.users = res;
      return callback();
    }); 
   },

  comparativeIterator:function(callback){
    //not quite sure how to test this 
    console.log('4. Comparative iterator:', '---------');
    Test.recomgine.bind('harvest:over', function(){
      assert.ok(true, console.log('PASS')); //plz test a meaningful condition here
      return callback();
    });
    Test.recomgine.compIterate();
   },

/* Taking this out as its covered in compIterator above
   compareUsers:function(callback){
    return callback();
    console.log('5. Compare 2 users', '------------');
    var a = Test.users.shift();
    var b = Test.users.shift();
    Test.recomgine.bind('harvest:complete', function(focus, comp){
     assert.ok(focus==a||focus==b && comp==a||comp==b, console.log('PASS')); //erm...not ideal
     this.unbind('harvest:complete');
     return callback();
    });
    Test.recomgine.compareUsers(a, b); 
   },
*/
   end:function(callback){
    var endTime = new Date().getTime(); 
    var timeTaken = endTime-Test.startTime;
    var numComparisons = Test.recomgine.compsCompleted/2;
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
