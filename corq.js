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

	var Q = []; //the queue
	var _persist = null;
	var _load = null;
	var callbacks = {};
	var consecutiveFails = 0;
	var debug,that;

	var corq = function(msFrequency, msDelay, chatty){
		this.version = '0.0.1';
		this.queue = Q;
		this.running = false;
		this.frequency = msFrequency || 1000 * 5; //default to 5sec
		this.delay = false;
		this.delayLength = msDelay || 1000 * 30; //default to 30sec
		that = this;
		debug = chatty || false;
		$debug('Corq initialized. Freq: ' + this.frequency + 'ms, Cooldown: ' + this.delayLength + 'ms');
		return this;
	};

	//optional persistence implementation -- use it however you like!
	corq.prototype.persistVia = function(persistCallback){
		_persist = persistCallback;
		return this;
	};
	//optional data loading implementation -- asynchronous because that's the lowest common denominator
	corq.prototype.loadVia = function(loadCallback){
		debug('Corq: Loading data...');
		loadCallback(function(data){
			Q = data;
			$debug('Corq: Data loaded');
			$debug(Q);
		});
		return this;
	};

	//add an item to the queue
	corq.prototype.push = function(type, item){
		Q.push( { data:item, type:type, id:$guid() } );
		if (_persist){ _persist(Q); }
		$debug('Corq: Item added to queue `' + type + '`');
		$debug(item);
		if (!this.running){
			this.running = true;
			$next();
		}
		return this;
	};

	//stop the queue
	corq.prototype.stop = function(){
		this.running = false;
		$debug('Corq: Queue stopped');
		return this;
	};

	//register item handlers
	corq.prototype.on = function(typeName, callback){
		if (callbacks[typeName]){
			throw "You may only have one handler per item type. You already have one for `" + typeName + "`";
		}
		callbacks[typeName] = callback;
		$debug('Corq: Handler registered for `' + typeName + '`');
		return this;
	};

	function $next(){
		if (Q.length){
			$item(Q[0]);
		}else{
			that.running = false;
			$debug('Corq: No items to process, shutting down the queue');
		}
	}

	//calls all necessary handlers for this item
	function $item(item){
		var typeName = item.type;
		if (!callbacks[typeName]){
			throw "Item handler not found for items of type `" + typeName + "`";
		}
		$debug('Corq: Calling handler for item `' + typeName + '`');
		$debug(item.data);
		var _next = function(){
			var freq = (that.delay) ? that.delayLength : that.frequency;
			setTimeout(function(){
				$next();
			}, freq);
		};
		var _success = function(){
			$debug('Corq: Item processing SUCCESS `' + typeName + '` ');
			$debug(item.data);
			$success(item);
			_next();
		};
		var _fail = function(){
			$debug('Corq: Item processing FAILURE `' + typeName + '` ');
			$debug(item.data);
			$fail(item);
			_next();
		};
		try {
			callbacks[typeName](item.data, _success, _fail);
		}catch(e){
			$debug('Corq: Error thrown by item processing function `' + typeName + '` ');
			$debug(item.data);
			_fail();
			throw e;
		}
	}

	function $success(item){
		that.delay = false;
		consecutiveFails = 0;
		$delete(item.id);
	}

	function $fail(item){
		consecutiveFails++;
		$requeue(item);
		if (consecutiveFails >= Q.length){
			$debug('Corq: Queue is all failures, initiating cooldown (' + that.delayLength + 'ms)');
			that.delay = true;
		}
	}

	function $requeue(item){
		Q.push($clone(item));
		$delete(item.id);
	}

	function $delete(itemId){
		for (var i = 0; i < Q.length; i++){
			if (Q[i].id === itemId) {
				$debug('Corq: Item deleted from queue `' + Q[i].type + '` ');
				$debug(Q[i].data);
				Q.splice(i,1);
				if (_persist){ _persist(Q); }
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
