
	var express = require('express'),
		routes  = require('./routes'),
		xml2js = require('xml2js'),
		http = require('http');
			
	
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

	var client = http.createClient(80, 'www.thesun.co.uk');

	app.get('/', function(req, res){

		var request = client.request('GET', '/sol/homepage/feeds/iPad/news/?iPadApp=true', {'host': 'www.thesun.co.uk'});

		request.addListener('response', function (response) {

			var data = '';

     		response.addListener('data', function(chunk){ 
	        	data += chunk; 
			});

			response.addListener('end', function(){

				var parser = new xml2js.Parser();
				parser.on('end', function(json) {
					res.send( json );
					console.log( JSON.stringify( json ) + "\n\n");
				});
				parser.parseString(data);

			});

		});
		
		request.end();
	});

	app.listen(8080);
	console.log("Listening on port %d in %s mode", app.address().port, app.settings.env);
	
