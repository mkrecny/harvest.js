# Harvest
Harvest is a collaborative filtering tool for node. The envisioned use case is building recommendation engines with very little sweat. Currently harvest only supports binary choice user input e.g.: the 'like' or 'favorite' button. It persists to redis and leverages node-redis-scripting and redis-extend.
NOTE: extremely early-stage and only eager developer friendly!

## Usage
### Adding a 'like'
<pre>
	var subject = 'likes'; //note: this could be anything based on your application
	var threshold = 0.6; //similarity threshold that two users have to cross to be be used as recommendations to each other
	var harvest = require('/path/to/harvest.js').create(subject, threshold);
	harvest.addUserElement(user_id, elements_to_add, callback);
</pre>

### Adding a user
<pre>
	harvest.addUser(user_id, callback);
</pre>

### Running the filter
<pre>
	node run.js
	
	//This should result in output looking like this:
	===========STARTING NEW HARVEST===========
	may take a while for large datasets........
	==========================================
	===================================
	HARVEST COMPLETED
	===================================
	USER BASE: 10
	HARVESTS: 9
	COMPARISONS: 45
	EXECUTION TIME: 14 ms
	EXECUTION RATE: 3.21 comps/ms
	====================================
</pre>

### Running tests
<pre>
	//just populate a test db (uses db 10)
	node tests/populate.js [num of users] [num of els per user]
	//run full test (populate + filter)
	node tests/harvest.test.js [num of users] [num of els per user]
</pre>