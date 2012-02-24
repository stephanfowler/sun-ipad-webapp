
	var feeds = [
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/breaking_news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/showbiz/?iPadApp=true',
	];

	var edition = "20120224",
		articles = {};

	var express = require('express'),
		mongoose = require('mongoose'),
		xml2js = require('xml2js'),
		http = require('http'),
		us = require('underscore'),
		Iconv = require('iconv').Iconv;

	var models = require('./models');

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
	mongoose.connect( 'mongodb://localhost/thesun_' + edition );
	var Article = require('mongoose').model('Article');

	// HTTP client setup
	var client = http.createClient(80, 'www.thesun.co.uk');

	// HTTP and XML utils
	var getHost = function(url) {
		var m = url.match(/http:\/\/([^\/]+).*/);
		if ( m[1] ) {
			return m[1]
		}
	};

	var getPath = function(url) {
		var m = url.match(/http:\/\/[^\/]+(.*)/);
		if ( m[1] ) {
			return m[1]
		}
	};
	
	var getXmlAsJson = function( url, callback ) {
		if ( getHost(url) && getPath(url) ) {
			var request = client.request('GET', getPath(url), {'host': getHost(url)});
			request.on('response', function (response) {
				var data = '';
				response.on('data', function(chunk){ 
					data += chunk; 
				});
				response.on('end', function(){
					var parser = new xml2js.Parser('UTF-8');
					parser.on('end', function( json ) {
						callback( url, json ) 
					});
					parser.parseString(data);
				});
			});
			request.end();
		};
	};

	var parseIndexFeed = function( url, json ) { 
		var sectionOrder = 0;
		for ( i in json.article ) {
			var a = json.article[i];
			//console.log( 'CHECKING: ' + a.uri );
			var parseIfNew = function( a ) {
				Article.count( { uri: a.uri }, function( err, result ){
					if ( result ) {	
						console.log( 'EXISTS ALREADY: ' + result + ' ' + a.uri );
					}
					else {
						//console.log( 'FETCHING: ' + result + ' ' + a.uri );
						var am = new Article();
						am.sectionOrder     = sectionOrder;
						am.uri             = conv.convert(a.uri);
						am.section         = conv.convert(json.section);
						am.title           = conv.convert(a.title);
						am.sectionheadline = conv.convert(a.sectionheadline);
						am.tickerheadline  = conv.convert(a.tickerheadline);
						am.teaser          = conv.convert(a.teaser);
						am.teaserImg       = conv.convert(a.teaserImg);
						articles[a.uri]    = am;
						getXmlAsJson( a.uri, parseArticleFeed );
						sectionOrder++;
					}
				});
			}
			parseIfNew( a );
		}
	};

	var parseArticleFeed = function( url, json ) {
		if ( json.article_content ) {
			var a = json.article_content;
			if ( 1 ) {
				articles[url].id	      = a.id; 
				articles[url].byline      = conv.convert(a.byline); 
				articles[url].timestamp   = conv.convert(a.timestamp); 
				articles[url].articlebody = conv.convert(a.articlebody); 
				articles[url].attachments = [];
				// a fix for when attachments has only one attachemt child. What's a better way?
				var attachments = typeof a.attachments.attachment[1] == 'undefined' ? a.attachments : a.attachments.attachment;
				for ( i in attachments ) {
					var at = attachments[i];
					var attSpec = { uri: at.uri }
					if ( typeof at.caption === 'string') {
						// This is producing bin data. TBC.
						attSpec.caption = conv.convert(at.caption);
					}
					var attachment = {};
					attachment[at.type] = attSpec;
					articles[url].attachments.push( attachment );
				}
				articles[url].save(function (err){});
				console.log( "ADDED : " + articles[url].uri );
			}
		}
	};

	for ( i in feeds ) {
		getXmlAsJson( feeds[i], parseIndexFeed );
	};

	app.listen(8080);

