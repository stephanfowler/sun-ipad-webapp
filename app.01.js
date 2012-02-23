
	var express = require('express'),
		mongoose = require('mongoose'),
		routes  = require('./routes'),
		xml2js = require('xml2js'),
		http = require('http'),
		us = require('underscore'),
		Iconv = require('iconv').Iconv;

	var app = module.exports = express.createServer();

	var conv = new Iconv('UTF-8', 'ASCII//IGNORE');
	
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
	mongoose.connect('mongodb://localhost/thesun01');
	Schema = mongoose.Schema; 
	var ArticleSchema = new Schema({
		uri             : { type: String, index: { unique: true } }, 
		section         : String,
		title           : String,
		sectionheadline : String,
		tickerheadline  : String,
		teaser          : String,
		teaserImg       : String
	});
	var MyArticleModel = mongoose.model( 'ArticleModel', ArticleSchema );

	// HTTP client setup
	var client = http.createClient(80, 'www.thesun.co.uk');
	var request = client.request('GET', '/sol/homepage/feeds/iPad/news/?iPadApp=true', {'host': 'www.thesun.co.uk'});

	// Get the feeds...
	request.on('response', function (response) {

		var data = '';

		response.on('data', function(chunk){ 
			data += chunk; 
		});

		response.on('end', function(){

			var parserIndex = new xml2js.Parser('UTF-8');
			parserIndex.on('end', function(json) {
				for ( i in json.article ) {
					var a = json.article[i];
					var am = new MyArticleModel();
					am.uri             = conv.convert(a.uri);
					am.section         = conv.convert(json.section);
					am.title           = conv.convert(a.title);
					am.sectionheadline = conv.convert(a.sectionheadline);
					am.tickerheadline  = conv.convert(a.tickerheadline);
					am.teaser          = conv.convert(a.teaser);
					am.teaserImg       = conv.convert(a.teaserImg);
					console.log(am.uri);
					am.save(function (err){});
				}
			});
			parserIndex.parseString(data);

		});

	});
	
	request.end();

	app.get('/', function(req, res){
	});

	app.listen(8080);
	console.log("Listening on port %d in %s mode", app.address().port, app.settings.env);
	
