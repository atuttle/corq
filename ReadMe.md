# Corq

Corq (pronounced "cork") is simply an item-processing queue. Push in any data at any rate, and process each item after a short, configurable delay.

If processing fails, the item moves to the back of the queue. If everything in the queue fails then a cooldown period is invoked before trying again.

## Inspiration

Before this was a module it was a complex system of recursive functions embedded in a larger system. It was part of a Phonegap application and the requirement was to send data to the server with a guarantee no data would ever be lost -- be it due to a network outage, server downtime, runtime error, or any unforseen circumstance. To the best of my knowledge it has served that purpose beautifully, so I thought it would be prudent to refactor it into a reusable module / library.

## Compatibility

Corq runs in the browser -- with RequireJS or just as window.Corq; and also on Node.js. No code changes are necessary for any of these environments.

# Instantiate

### Vanilla Browser

	<script src="corq.js"></script>

### RequireJS

	require(['libs/corq'], function(Corq){
		// ...
	});

### Node.js

	var Corq = require('corq');

# Synchronously Asynchronous

Corq uses asynchronous callbacks where necessary to allow your code (persistence, processing) to run asynchronous tasks; but items are processed synchronously. Index 1 is not processed until index 0 is complete (regardless of success/fail) + the inter-item delay.

# Usage

Create a new queue with a 5s delay between items and a 30s delay if the entire queue fails.

	var queue = new Corq(5000, 30*1000);

These are the default values, so if you like you can write it this way instead:

	var queue = new Corq();

Now register item-type handlers:

	//handle items of type `foo`
	queue.on('foo', function(item, success, fail){
		/* handle item */

		if (/* item is successfully processed and can be discarded */){
			success();
		}else{
			fail();
		}
	});

Some time later, an item is thrown in the queue. It could even be 100 items - it doesn't matter.

	queue.push('foo', { foo: 'bar', fizz: 'buzz' });

The queue internal timers start when you add an item to the queue, and automatically shut down when the queue is empty.

If you want the current length of the queue, simly call `.length()`:

	console.log( 'current queue length: %s', queue.length() );

### Chaining

All public methods (except `length()`) are chainable:

	var q = new Corq()
				.on('foo', function(){ /* ... */ })
				.on('bar', function(){ /* ... */ })
				.push('foo', { /* ... */ })
				.push('bar', { /* ... */ })

## Persistence

Corq can optionally persist the queue whenever its data changes.

	queue.persistVia(function(data){ /* persistence mechanism is up to you */ });

	queue.loadVia(function(callback){
		//get the data back from persistence -- details are up to you

		//then:
		callback(data);
	});

Data is loaded immediately when you run `loadVia()`. **Do not return the data, pass it to the supplied callback.**

When the loaded data is not empty, the processing queue is _not_ automatically started. You may want to check the queue length with `q.length()` and then start it manually with `q.start()`.

## Persistence: There be dragons here

Be mindful of your persistence and processing-delay settings. Data will be persisted every time the queue content changes. This includes: queueing new items, success (removing the item from the queue), and failure (requeueing the item).

If your inter-item delay is 2ms, you expect large queues, and average persist-save requires 20ms, it is conceivable that data will be persisted every 22ms for extended durations. For this reason I recommend that you start with at least a full 1000ms delay and at least 30000ms (30s) cooldown delay, so that if your persistence method does start to choke, it will be allowed some time to catch up.


# License

> The MIT License (MIT)
>
> Copyright (C) 2014 Adam Tuttle
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
