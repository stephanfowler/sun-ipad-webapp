
	var express  = require('express'),
		mongoose = require('mongoose'),
		us       = require('underscore'),
		nowjs    = require("now");

	var models   = require('./models');

	var app = module.exports = express.createServer();

	// Configuration
	app.configure(function(){
	  app.set('views', __dirname + '/views');
	  app.set('view engine', 'jade');
	  app.use(express.bodyParser());
	  app.use(express.methodOverride());
	  app.use(app.router);
	  app.use(express.static(__dirname + '/public'));
	});
	app.configure('development', function(){
	  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	});
	app.configure('production', function(){
	  app.use(express.errorHandler()); 
	});

	// Mongo setup
	mongoose.connect( 'mongodb://localhost/thesun_02' );
    var Edition = require('mongoose').model('Edition');

	// Routes
	app.get('/', function(req, res){
		// Find previous 3 edition IDs
		Edition.find( {}, { id:1, _id:0 }, { limit:3, sort:{ id: -1 } }, function( err, doc ) {
			res.render('index.jade', { editions: doc } );
		});
	});

	app.get('/api/edition', function (req, res) {
		// Get latest stored edition
		Edition.findOne({}, {_id:0}, { sort:{ id: -1 } }, function( err, doc ) {
			if (err) res.writeHead(500, err.message)
			else if( !doc ) {
				res.writeHead(404);
				res.end();
			}
			else {
				res.writeHead( 200, { 'Content-Type': 'application/json' });
				res.end( JSON.stringify( doc )  );
			};
		});
	});

	app.get('/api/edition/:id', function (req, res) {
		Edition.findOne({ id: Number(req.params.id) }, function( err, doc ){
			if (err) res.writeHead(500, err.message)
			else if( !doc ) {
				res.writeHead(404);
				res.end();
			}
			else {
				res.writeHead( 200, { 'Content-Type': 'application/json' });
				res.end( JSON.stringify( doc)  );
			};
		});
	});

	app.listen(8080);
	console.log('listening...');

