	var feeds = [
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/breaking_news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/showbiz/?iPadApp=true',
	];

	var edition = "20120224";

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
	mongoose.connect( 'mongodb://localhost/thesun' + edition );
	Schema = mongoose.Schema; 
	var ArticleSchema = new Schema({
		uri             : { type: String, index: { unique: true } }, 
		section         : String,
		title           : String,
		sectionheadline : String,
		tickerheadline  : String,
		teaser          : String,
		teaserImg       : String,
		byline          : String,
		timestamp       : String,
		articlebody     : String,
		image          : [AttachmentSchema],
		video          : [AttachmentSchema],
		article        : [AttachmentSchema],
	});
	var AttachmentSchema = new Schema({
		caption         : String,
		uri             : String
	});

	var MyArticleModel = mongoose.model( 'ArticleModel', ArticleSchema );

	// HTTP client setup
	var client = http.createClient(80, 'www.thesun.co.uk');

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
	
	// Grab the feeds...
	var articles = {};

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
		for ( i in json.article ) {
			var a = json.article[i];
			console.log( 'CHECKING: ' + a.uri );
			var parseIfNew = function( a ) {
				MyArticleModel.count( { uri: a.uri }, function( err, result ){
					if ( result ) {	
						console.log( 'EXISTS ALREADY: ' + result + ' ' + a.uri );
					}
					else {
						console.log( 'FETCHING: ' + result + ' ' + a.uri );
						var am = new MyArticleModel();
						am.uri             = conv.convert(a.uri);
						am.section         = conv.convert(json.section);
						am.title           = conv.convert(a.title);
						am.sectionheadline = conv.convert(a.sectionheadline);
						am.tickerheadline  = conv.convert(a.tickerheadline);
						am.teaser          = conv.convert(a.teaser);
						am.teaserImg       = conv.convert(a.teaserImg);
						articles[a.uri]    = am;
						getXmlAsJson( a.uri, parseArticleFeed );
					}
				});
			}
			parseIfNew( a );
		}
	};

	var parseArticleFeed = function( url, json ) {
		if ( json.article_content ) {
			var a = json.article_content;
			articles[url].byline      = conv.convert(a.byline); 
			articles[url].timestamp   = conv.convert(a.timestamp); 
			articles[url].articlebody = conv.convert(a.articlebody); 

			for ( i in a.attachments.attachment ) {
				var at = a.attachments.attachment[i];
				var attachment = { caption: conv.convert(at.caption), uri: conv.convert(at.uri) } ;
				if ( typeof articles[url][at.type] == 'undefined' ) {
					articles[url][at.type] = [];
				};
				articles[url][at.type].push( attachment );
			}
			articles[url].save(function (err){});
			console.log( "\n\nSAVED : " + articles[url].uri );
		}
	};

	for ( i in feeds ) {
		getXmlAsJson( feeds[i], parseIndexFeed );
	};

    app.get('/', function(req, res){
		res.end('Updated Edition: ' + edition );
	});

	app.listen(8080);

