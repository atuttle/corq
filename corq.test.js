const Corq = require( '../corq' );

test( 'persistVia called when an item is added to the queue', () => {
	const queue = new Corq();
	const persistCallback = () => { expect( true ).toBe( true ); };
	const handler = () => {};
	queue
		.persistVia( persistCallback )
		.on( 'test', handler )
		.push( 'test', 1 );
} );

test( 'loadVia calls the loader function', () => {
	const queue = new Corq();
	const loader = (cb) => { cb([]); expect( true ).toBe( true ); };
	const handler = () => {};
	queue
		.loadVia( loader )
		.on( 'test', handler )
		.push( 'test', 1 );
} );

test( 'calls the appropriate handler', () => {
	const queue = new Corq();
	const handler1 = () => { expect( false ).toBe( true ); }
	const handler2 = () => { expect( true ).toBe( true ); }
	queue
		.on( 'type1', handler1 )
		.on( 'type2', handler2 )
		.push( 'type2', 'hi mom' );
});

test( 'reports the correct queue length', () => {
	const queue = new Corq();
	const handler1 = () => {}
	queue
		.on( 'type1', handler1 )
		.push( 'type1', 'hi mom' );

	const len = queue.length();
	expect( len ).toBe( 1 );
});

test( 'stops when requested', () => {
	const queue = new Corq();
	const handler1 = () => {}
	queue
		.on( 'type1', handler1 )
		.push( 'type1', 'hi mom' )
		.stop();

	expect( queue.isRunning() ).toBe( false );
});

test( 'starts when requested', () => {
	const queue = new Corq();
	const handler1 = () => {}
	queue
		.on( 'type1', handler1 )
		.push( 'type1', 'hi mom' )
		.stop()
		.start();

	expect( queue.isRunning() ).toBe( true );
});

test( 'starts when an item is pushed', () => {
	const queue = new Corq();
	const handler1 = () => {}
	queue
		.on( 'type1', handler1 )
		.stop()
		.push( 'type1', 'hi mom' );

	expect( queue.isRunning() ).toBe( true );
});

test( 'throws on duplicate handlers', () => {
	const queue = new Corq();
	const handler1 = () => {}
	queue.on( 'type1', handler1 );

	expect( () => { queue.on( 'type1', handler1 ) } ).toThrow( /one handler per item type/ );
});

test( 'throws on unrecognized item types', () => {
	const queue = new Corq();
	const handler1 = () => {}
	queue.on( 'type1', handler1 );

	expect( () => { queue.push( 'type2','test' ) } ).toThrow( /handler not found/ );
});
