

	var feeds = [
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/top_stories/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/breaking_news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/sport/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/showbiz/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/tv/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/woman/?iPadApp=true'
	];

	var articles = {};

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
	mongoose.connect( 'mongodb://localhost/thesun_02' );
	var Edition = require('mongoose').model('Edition');
	var Article  = require('mongoose').model('Article');

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

	var IDalize = function( str ) {
		return str.toLowerCase().replace(/^\s+|\s+$/g, '').replace( /\s+/g, '-' ).replace( /[^a-z-]+/, '' );
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
		edition.sections.push( { name: json.section, id: IDalize(json.section), articles: json.article } );
		if ( edition.sections.length === feeds.length ) {
			edition.save(function (err){
				if ( err ) {
					console.log( "ERROR SAVING EDITION: " + err );
				}
				else {
					console.log( "Saved edition" );	
				}
			});
		};
		// Now fetch articles
		var doArticle = function( url ) {
			Article.findOne( { uri: url }, function( err, doc ){
				if ( doc ) {	
					console.log( 'Article already in store: ' + url );
				}
				else {
					console.log( 'Consider article: ' + url );
					getXmlAsJson( url, parseArticleFeed );
				}
			});
		};
		for ( i in json.article ) {
			doArticle( json.article[i].uri );
		}
	};

	var parseArticleFeed = function( url, json ) {
		if ( json.article_content ) {
			var a = json.article_content;
			var article = new Article( a );
			article.uri = url;
			
			// Rejig the attachments. TODO: could do this with a map instead? 
			article.attachments = {};
			var ats = {};
			// a fix for when attachments has only one attachemt child. What's a better way?
			var attachments = typeof a.attachments.attachment[1] == 'undefined' ? a.attachments : a.attachments.attachment;
			for ( i in attachments ) {
				var at = attachments[i];
				if ( typeof ats[at.type] == 'undefined' ) {
					ats[at.type] = [];
				}
				var attSpec = { uri: at.uri }
				if ( typeof at.caption === 'string') {
					attSpec.caption = at.caption
				}
				ats[at.type].push( attSpec );
			}
			article.attachments = ats;
			
			//console.log( JSON.stringify( article, null, 4 ) )	
			article.save(function (err){
				if ( err ) {
					console.log( "ERROR SAVING ARTICLE: " + err );
				}
				else {
					console.log( "Saved article " + article.uri );	
				}
			});
		}
	};

	var scrape = function() { 

		with (new Date()) var editionID = String(( getFullYear()*100 + getMonth()+1 )*100 + getDate());

		Edition.findOne( { id: editionID }, function( err, doc ) {
			if ( doc ) {
				console.log( 'Edition ' + doc.id + ' already exists!' );
				process.exit(1);
			}
			else { 
				edition = new Edition( { id: editionID } );
				console.log( 'Creating new edition ' + edition.id );
				for ( i in feeds ) {
					getXmlAsJson( feeds[i], parseIndexFeed );
				};
			}
		});
	};

	scrape();

	//setInterval( scrape, 60000 ); // every minute

	app.listen(8081);

