
	with (new Date()) var editionID = ( getFullYear()*100 + getMonth()+1 )*100 + getDate();
	//var editionID = 123456;

	var feeds = [
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/top_stories/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/sport/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/showbiz/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/woman/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/tv/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/breaking_news/?iPadApp=true',
	];

	var articles = {};

	var express = require('express'),
		mongoose = require('mongoose'),
		xml2js = require('xml2js'),
		http = require('http'),
		us = require('underscore'),
		async = require('async'),
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

	var getXmlAsJson = function( url, schemaProcessor, callback ) {
		if ( getHost(url) && getPath(url) ) {
			var request = client.request('GET', getPath(url), {'host': getHost(url)});
			request.on('response', function (response) {
                response.setEncoding("binary");
				var data = '';
				response.on('data', function(chunk){ 
					data += chunk; 
				});
				response.on('end', function(){
					var parser = new xml2js.Parser();
					parser.on('end', function( json ) {
						schemaProcessor( url, json, callback ) 
					});
					parser.parseString(data);
				});
			});
			request.end();
		}
		else {
			throw 'Bad url: ' + url; 
		}
	};

	var parseIndexFeed = function( url, json, callback ) {
		edition.sections.push( { name: json.section, id: IDalize(json.section), articles: json.article } );
		callback( null, json.article );
	};

	var parseArticleFeed = function( url, json, callback ) {
		if ( json.article_content ) {
			var a = json.article_content;
			var article = new Article( a );
			article.uri = url // Primary key
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
            article.save(function (err){
                if ( err ) {
                    console.log( "Duplicate?       : " + article.uri );
                }
                else {
                    console.log( "Saved article    : " + article.uri );
                }
				callback( null, article );
            });
		}
		else {
			callback( null, null );
		}
	};

	var scrape = function() { 
		Edition.findOne( { id: editionID }, function( err, doc ) {
			async.waterfall([

				// Create an empty edition
				function(callback){
					edition = new Edition({ id: editionID});
					callback( null, edition );
				},

				// Iterate over index feeds
				function( edition, callbackAfterFeeds ){
					async.forEach( 
						feeds, 
						function( url, callbackFeedDone ) {

							//console.log( 'Fetching section : ' + url );
							async.waterfall(
								[
									// Get & parse the index feed
									function( callback ) {
										getXmlAsJson( url, parseIndexFeed, callback );
									},

									// Iterate over article feeds
									function( articles, callbackAfterArticles ){
										async.forEach(
											us.pluck( articles, 'uri' ),
											function( url, callbackArticleDone ) {

												async.waterfall(
													[
														function( callback ) {
															Article.findOne( { uri: url }, function( err, doc ){
																if ( doc ) {	
																	//console.log( 'Already in store : ' + doc.headline );
																	callback( null, doc );
																}
																else {
																	console.log( 'Fetching article : ' + url );
																	getXmlAsJson( url, parseArticleFeed, callback );
																}
															});
														},

														function( doc, callback ) {
															//console.log( "Add to edition   : " + doc.headline );
															for ( s in edition.sections ) {
																var articles = edition.sections[s].articles;
																for ( a in articles ) {
																	var article = articles[a];
																	if ( url === article.uri ) {
																		article.id          = doc.id;
																		article.byline      = doc.byline;
																		article.timestamp   = doc.timestamp;
																		article.articlebody = doc.articlebody;
																		article.attachments = doc.attachments;
																	}
																}
															}
															callback();
														}
													],
													function(){
														callbackArticleDone();	
													}
												);

											},
											function(){
												callbackAfterArticles();	
											}
										)
									}

								], 
								function(){
									callbackFeedDone();	
								}
							);
							
						},
						function() {
							//console.log("FEEDS DONE\n")
							callbackAfterFeeds( null, edition );
						}
					);
				},


				function( edition, callback ) {
					// Get a list of the top stories
					var topStories = us.find( edition.sections, function(s){ return s.id === 'top-stories'} );
					if( topStories ) {
						topStories = us.pluck( topStories.articles, 'uri' )
						// Remove the actual Top Stories section (the articles all appear elsewhere) (hopefully!)
						edition.sections  = us.reject( edition.sections, function(s){ return s.id === 'top-stories'}  );
					}
					//console.log( "Cleaning up edition... " );
					var id = 0;
					for ( s in edition.sections ) {
						
						var articles = edition.sections[s].articles;
						for ( a in articles ) {
							var article = articles[a];
							// Mark top stories
							if ( us.indexOf( topStories, article.uri ) > -1 ) {
								article.role = 'top';
							}
							else {
								article.role = '';
							}
							delete article.uri; // No longer needed?
							article.id = id;
							if ( typeof article.image == 'string' ) {
								article.image = article.image.replace( /[a-z]{1,1}.jpg/, 'a.jpg' )
							}
							else {
								delete article.image;
							}
							id++;
						}
					}
					callback( null, edition );
				}

			], function (err, edition ) {
				var edo = edition.toObject();
				delete edo._id;
				Edition.update( { id:editionID }, edo, {upsert: true}, function (err){
					if ( err ) {
						console.log( "ERROR SAVING EDITION: " + err );
					}
					else {
						console.log( "Saved edition " + edition.id );	
					}
					//process.exit(0);
				});

			});
		
		});
	};

	scrape();
	setInterval( scrape, 600000 );

	app.listen(8081);
