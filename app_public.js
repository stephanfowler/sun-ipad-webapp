
	var express  = require('express'),
		mongoose = require('mongoose'),
		us       = require('underscore'),
		nowjs    = require("now");

	var models   = require('./models');

	var app = module.exports = express.createServer();

	allowAnyBrowser = true;

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
		if ( allowAnyBrowser || ( req.headers['user-agent'] && /ipad/i.test(req.headers['user-agent']) ) ) {
			// Find previous 2 edition IDs
			Edition.find( {}, { id:1, _id:0 }, { limit:2, sort:{ id: -1 } }, function( err, doc ) {
				var editions = [ { name: 'Today', id: doc[0].id }, { name:'Yesterday', id: doc[1].id } ];
				res.render('index.jade', { editions: editions } );
			});
		}
		else { 
			res.end('Sorry... this URL only works on iPads!')
		}
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

