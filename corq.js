/*
 * Corq: a queueing library
 * MIT Licensed
 * http://github.com/atuttle/corq
 */
(function(lib){
	if (typeof define === 'function' && define.amd){
		//requirejs, define as a module
		define(lib);
	}else if (typeof module === 'object' && typeof module.exports === 'object'){
		//nodejs module
		module.exports = lib();
	}else{
		window.Corq = lib();
	}
//above this line: define as RequireJS module if RequireJS found; otherwise set into window
//below this line: actual Corq code.
}(function(){

    // var Q = []; //the queue
    // var _persist = null;
    // var _load = null;
    // var callbacks = {};
    // var consecutiveFails = 0;
    // var debug,that;

	var corq = function(msFrequency, msDelay, chatty){
		this.version = '0.2.2';
		this.queue = [];
		this.running = false;
        this.callbacks = {};
		this.frequency = msFrequency || 1000 * 5; //default to 5sec
		this.delay = false;
		this.delayLength = msDelay || 1000 * 30; //default to 30sec
        this.persist = null;
        this.load = null;
        this.consecutiveFails = 0;
		this.debug = chatty || false;
		$debug('Corq initialized. Freq: ' + this.frequency + 'ms, Cooldown: ' + this.delayLength + 'ms');
		return this;
	};

	//optional persistence implementation -- use it however you like!
	corq.prototype.persistVia = function(persistCallback){
		this.persist = persistCallback;
		return this;
	};
	//optional data loading implementation -- asynchronous because that's the lowest common denominator
	corq.prototype.loadVia = function(loadCallback){
		$debug('Corq: Loading data...');
		loadCallback(function(data){
			this.queue = data;
			$debug('Corq: Data loaded');
			$debug(this.queue);
		});
		return this;
	};

	//add an item to the queue
	corq.prototype.push = function(type, item){
		this.queue.push( { data:item, type:type, id:$guid() } );
		if (this.persist){ this.persist(this.queue); }
		$debug('Corq: Item added to queue `' + type + '`');
		$debug(item);
		this.start();
		return this;
	};

	//stop the queue
	corq.prototype.stop = function(){
		this.running = false;
		$debug('Corq: Queue stopped');
		return this;
	};

	corq.prototype.start = function(){
		if (!this.running){
			this.running = true;
			$next(this);
		}
	};

	//register item handlers
	corq.prototype.on = function(typeName, callback){
		if (this.callbacks[typeName]){
			throw "You may only have one handler per item type. You already have one for `" + typeName + "`";
		}
		this.callbacks[typeName] = callback;
		$debug('Corq: Handler registered for `' + typeName + '`');
		return this;
	};

	corq.prototype.length = function(){
		return this.queue.length;
	}

	function $next(corq){
		if (corq.queue.length){
			$item(corq, corq.queue[0]);
		}else{
			corq.running = false;
			$debug('Corq: No items to process, shutting down the queue');
		}
	}

	//calls all necessary handlers for this item
	function $item(corq, item){
		var typeName = item.type;
		if (!corq.callbacks[typeName]){
			throw "Item handler not found for items of type `" + typeName + "`";
		}
		$debug('Corq: Calling handler for item `' + typeName + '`');
		$debug(item.data);
		var _next = function(){
			var freq = (corq.delay) ? corq.delayLength : corq.frequency;
			setTimeout(function(){
				$next(corq);
			}, freq);
		};
		var _success = function(){
			$debug('Corq: Item processing SUCCESS `' + typeName + '` ');
			$debug(item.data);
			$success(corq,item);
			_next();
		};
		var _fail = function(){
			$debug('Corq: Item processing FAILURE `' + typeName + '` ');
			$debug(item.data);
			$fail(corq, item);
			_next();
		};
		try {
			corq.callbacks[typeName](item.data, _success, _fail);
		}catch(e){
			$debug('Corq: Error thrown by item processing function `' + typeName + '` ');
			$debug(item.data);
			_fail();
			throw e;
		}
	}

	function $success(corq,item){
		corq.delay = false;
		consecutiveFails = 0;
		$delete(corq,item.id);
	}

	function $fail(corq,item){
		consecutiveFails++;
		$requeue(corq,item);
		if (consecutiveFails >= corq.queue.length){
			$debug('Corq: Queue is all failures, initiating cooldown (' + corq.delayLength + 'ms)');
			corq.delay = true;
		}
	}

	function $requeue(corq,item){
		corq.queue.push($clone(item));
		$delete(corq,item.id);
	}

	function $delete(corq,itemId){
		for (var i = 0; i < corq.queue.length; i++){
			if (corq.queue[i].id === itemId) {
				$debug('Corq: Item deleted from queue `' + corq.queue[i].type + '` ');
				$debug(corq.queue[i].data);
				corq.queue.splice(i,1);
				if (corq.persist){ corq.persist(corq.queue); }
				break;
			}
		}
	}

	function $guid(){
		// http://stackoverflow.com/a/2117523/751
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}

	function $clone(obj) {
		// http://stackoverflow.com/a/728694/751
		// Handle the 3 simple types, and null or undefined
		if (null == obj || "object" != typeof obj) return obj;

		// Handle Date
		if (obj instanceof Date) {
			var copy = new Date();
			copy.setTime(obj.getTime());
			return copy;
		}

		// Handle Array
		if (obj instanceof Array) {
			var copy = [];
			for (var i = 0, len = obj.length; i < len; i++) {
				copy[i] = $clone(obj[i]);
			}
			return copy;
		}

		// Handle Object
		if (obj instanceof Object) {
			var copy = {};
			for (var attr in obj) {
				if (obj.hasOwnProperty(attr)) copy[attr] = $clone(obj[attr]);
			}
			return copy;
		}

		throw new Error("Unable to copy obj! Its type isn't supported.");
	}

	function $debug(msg){
		if (debug){
			console.log(msg);
		}
	}

	return corq;

}));
