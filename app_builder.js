
	with (new Date()) var editionID = ( getFullYear()*100 + getMonth()+1 )*100 + getDate();

	var feeds = [
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/top_stories/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/sport/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/showbiz/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/woman/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/tv/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/breaking_news/?iPadApp=true',
	];

	var express = require('express'),
		mongoose = require('mongoose'),
		xml2js = require('xml2js'),
		http = require('http'),
		us = require('underscore'),
		async = require('async'),
		Iconv = require('iconv').Iconv,
		im = require('imagemagick'),
		models = require('./models'), 
		fs = require('fs');

	var app = module.exports = express.createServer();
	var conv = new Iconv('UTF-8', 'ASCII//IGNORE');

	im.identify.path = "/usr/bin/identify";
	im.convert.path  = "/usr/bin/convert";

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
	mongoose.connect( 'mongodb://localhost/thesun_04' );
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

	var parseArticleFeed = function( url, json, callbackFinal ) {
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
			if ( ats.image && ats.image[0] ) {
				article.image = ats.image[0].uri.replace( /[a-z]{1,1}\.(jpg|png)$/, "a.jpg" )
				if ( ats.image[0].caption ) {
					article.subdeck = ats.image[0].caption;
				}
			}
			article.attachments = ats;
			async.waterfall(
				[
					function( callback ) {
						if ( article.image ) {
							im.identify( article.image, function(err, spec){
								if (err) {
									// Oh well. Couldn't retreive image?
								}
								else {
									article.imagelarge     = spec.width > 250;
									article.imageportrait  = spec.width < spec.height;
								}
								callback( null )
							})
						}
						else {
							callback( null )
						}
					},
					function() {
						article.save(function (err){
							if ( err ) {
								//console.log( "Duplicate?       : " + article.uri );
							}
							else {
								//console.log( "Saved article    : " + article.uri );
							}
							callbackFinal( null, article );
						});
					}
				] 
			);
		}
		else {
			callbackFinal( null, null );
		}
	};

	var buildEdition = function() { 
		Edition.findOne( { id: editionID }, function( err, doc ) {
			async.waterfall([

				// Create an empty edition
				function(callback){
					edition = new Edition({ id: editionID});
					callback( null, edition );
				},

				// Iterate over index feeds
				function( edition, callbackAfterFeeds ){
					async.forEachLimit( 
						feeds,
						10,
						function( url, callbackFeedDone ) {
							async.waterfall(
								[
									// Get & parse the index feed
									function( callback ) {
										getXmlAsJson( url, parseIndexFeed, callback );
									},

									// Iterate over article feeds
									function( articles, callbackAfterArticles ){
										async.forEachLimit(
											us.pluck( articles, 'uri' ),
											10,
											function( url, callbackArticleDone ) {

												async.waterfall(
													[
														function( callback ) {
															Article.findOne( { uri: url }, { _id:0 }, function( err, doc ){
																if ( doc ) {	
																	callback( null, doc );
																}
																else {
																	getXmlAsJson( url, parseArticleFeed, callback );
																}
															});
														},

														function( doc, callback ) {
															for ( s in edition.sections ) {
																for ( a in edition.sections[s].articles ) {
																	if ( url === edition.sections[s].articles[a].uri ) {
																		doc.uri = url;
																		edition.sections[s].articles[a] = doc;
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
					// Shuffle up top stories within their sections
					for ( s in edition.sections ) {
						var ordered = [];	
						var articles = edition.sections[s].articles;
						for ( a in articles ) {
							var article = articles[a];
							article = article.toObject();
							// strip links from articlebody;
							article.articlebody = article.articlebody.replace(/<a\/?[^>]*>/g,'')
							article.section = edition.sections[s].id;
							// Mark top stories and move them to the top
							if ( article.isTop || us.indexOf( topStories, article.uri ) > -1 ) {
								article.isTop = 1;
								ordered.unshift( article );
							}
							else {
								article.isTop = 0;
								ordered.push( article );
							}
						}
						edition.sections[s].articles = ordered;
					}
					// Create a front section, using 3 interleaved articles for each section
					var front = { name: "Front", id: "front", articles: [] };
					for ( var a = 0; a < 3; a++ ) {
						for ( var s = 0; s < edition.sections.length; s++ ) {
							var plucked = us.clone( edition.sections[s].articles[a] );
							// Add article to front if not already in there
							if ( ! us.include( us.pluck(front.articles, 'id'), plucked.id ) ) {
								if ( a == 0 && s == 0 ) {
									plucked.isTop = 2;
								}
								else if ( a == 0 && s == 1 ) {
									plucked.isTop = 1;
								}
								else {
									plucked.isTop = 0;
								}
								delete plucked.articlebody;
								front.articles.push( plucked );
							}
						}
					}
					edition.sections.unshift( front );
					callback( null, edition );
				}

			], function (err, edition ) {
				fs.writeFile( __dirname + '/public/editions/latest.json', JSON.stringify(edition), 'utf8', function(){
					console.log('Saved latest to file');	
					process.exit(code=0)
				});

			});
		
		});
	};

	// Routes

	app.get('/:article?', function(req,res){
		fs.readFile( __dirname + '/public/editions/latest.json', function( err, docEdition ) {
			if (err) res.writeHead(500, err.message)
			else if( !docEdition ) {
				res.send('No edition found..');
			}
			else {
				Article.findOne({id:req.params.article}, {_id:0}, function( err, docArticle ) {
					if (err) res.writeHead(500, err.message)
					else if( !docArticle ) {
						res.render( 'edit', { edition: JSON.parse(docEdition), headline: '', json: '' } );
					}
					else {
						res.render( 'edit', { edition: JSON.parse(docEdition), id: req.params.article, headline: docArticle.headline, json: JSON.stringify( docArticle,null,2 ) } );
					};
				});
			};
		});
	});

	app.post('/:article', function(req,res){
		var edited = JSON.parse(req.body.articleJson);
		Article.update( { id:req.params.article }, edited, {upsert: true}, function (err){
			if ( err ) {
				//console.log( "ERROR SAVING ARTICLE: " + err );
			}
			else {
				buildEdition();
				res.statusCode = 301;
				res.setHeader("Location", '/' + req.params.article + '#saved');
				res.end();
			}
		});
	});

	app.get('/article/:a', function(req, res){
		Article.findOne({id:req.params.a}, {_id:0}, function( err, article ) {
			if ( err ) {
				//console.log( err );
			}
			else if ( ! article ) {
				res.end('That article doesn\'t exist!')
			}
			else {
				res.render( 'article', { article: article } );
			}
		});
	});

	app.listen(8081);
	console.log('Listening...');
	//setInterval( buildEdition, 600000 ); // 10 minutes

	buildEdition();
    
