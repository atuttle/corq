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
	var that;

	var corq = function(msFrequency, msDelay){
		this.version = '0.0.1';
		this.queue = Q;
		this.running = false;
		this.frequency = msFrequency || 1000 * 5; //default to 5sec
		this.delay = false;
		this.delayLength = msDelay || 1000 * 30; //default to 30sec
		that = this;
		return this;
	};

	//optional persistence implementation -- use it however you like!
	corq.prototype.persistVia = function(persistCallback){
		_persist = persistCallback;
		return this;
	};
	//optional data loading implementation -- asynchronous because that's the lowest common denominator
	corq.prototype.loadVia = function(loadCallback){
		loadCallback(function(data){ Q = data; });
		return this;
	};

	//add an item to the queue
	corq.prototype.push = function(type, item){
		Q.push( { data:item, type:type, id:$guid() } );
		if (_persist){ _persist(Q); }
		return this;
	};

	//start the queue
	corq.prototype.start = function(){
		this.running = true;
		$next();
		return this;
	};
	//stop the queue
	corq.prototype.stop = function(){
		this.running = false;
		return this;
	};

	//register item handlers
	corq.prototype.on = function(typeName, callback){
		if (callbacks[typeName]){
			throw "You may only have one handler per item type. You already have one for `" + typeName + "`";
		}
		callbacks[typeName] = callback;
		return this;
	};

	function $next(){
		if (Q.length){
			$item(Q[0]);
		}else{
			setTimeout(function(){ $next(); }, that.frequency);
		}
	}

	//calls all necessary handlers for this item
	function $item(item){
		var typeName = item.type;
		if (!callbacks[typeName]){
			throw "Item handler not found for items of type `" + typeName + "`";
		}
		var _next = function(){
			var freq = (that.delay) ? that.delayLength : that.frequency;
			setTimeout(function(){
				$next();
			}, freq);
		};
		var _success = function(){
			$success(item);
			_next();
		};
		var _fail = function(){
			$fail(item);
			_next();
		};
		try {
			callbacks[typeName](item.data, _success, _fail);
		}catch(e){
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
			that.delay = true;
		}
	}

	function $requeue(item){
		Q.push(item);
		$delete(item.id);
	}

	function $delete(itemId){
		for (var i = 0; i < Q.length; i++){
			if (Q[i].id === itemId) {
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

	return corq;

}));
