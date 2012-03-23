
	var allowAnyBrowser = false;
	
	var express = require('express'),
		mongoose = require('mongoose'),
		gzippo = require('gzippo'),
		us = require('underscore'),
		models = require('./models'); 

	var app = module.exports = express.createServer();

	// Configuration
	app.configure(function(){
		app.set('views', __dirname + '/views');
		app.set('view engine', 'jade');
		app.use(express.bodyParser());
		app.use(express.methodOverride());
		app.use(app.router);
		app.use(express.static(__dirname + '/public'));
		//app.use( gzippo.staticGzip(__dirname + '/public', { maxAge:0, clientMaxAge:0 } ) );
	});
	app.configure('development', function(){
		app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
	});
	app.configure('production', function(){
		app.use(express.errorHandler()); 
	});

	// Mongo setup
	mongoose.connect( 'mongodb://localhost/thesun_04' );
	var Edition = require('mongoose').model('Edition');
	var Article  = require('mongoose').model('Article');

	// Routes
	app.get('/', function(req, res){
		if ( allowAnyBrowser || ( req.headers['user-agent'] && /ipad/i.test(req.headers['user-agent']) ) ) {
			res.render('index');
		}
		else { 
			res.end('Sorry... this URL only works on iPads!')
		}
	});

	app.listen(8080);
	console.log('listening...');
