
	with (new Date()) var editionID = ( getFullYear()*100 + getMonth()+1 )*100 + getDate();

	var feeds = [
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/top_stories/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/breaking_news/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/showbiz/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/woman/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/tv/?iPadApp=true',
		'http://www.thesun.co.uk/sol/homepage/feeds/iPad/sport/?iPadApp=true',
	];

	var express = require('express'),
		mongoose = require('mongoose'),
		xml2js = require('xml2js-expat'),
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
	mongoose.connect( 'mongodb://localhost/thesun_11' );
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
                //response.setEncoding("binary");
				var data = '';
				response.on('data', function(chunk){ 
					data += chunk; 
				});
				response.on('end', function(){
					var parser = new xml2js.Parser('UTF-8');
					parser.on('end', function( json ) {
						schemaProcessor( url, json, callback );
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
			var attachments;
			if ( a.attachments && a.attachments.attachment ) {
				// a fix for when attachments has only one attachemt child. What's a better way?
				attachments = typeof a.attachments.attachment[1] == 'undefined' ? a.attachments : a.attachments.attachment;
				for ( i in attachments ) {
					var at = attachments[i];
					if ( typeof ats[at.type] == 'undefined' ) {
						ats[at.type] = [];
					}
					var attSpec = { uri: at.uri };
					if ( at.type == 'video' ) {
						attSpec.js = '<script type="text/javascript" src="http://player.ooyala.com/player.js?embedCode=' + at.uri + '&deepLinkEmbedCode=' + at.uri + '"></script>';
					}
					if ( at.caption ) {
						attSpec.caption = at.caption
					}
					ats[at.type].push( attSpec );
				}
				if ( ats.image && ats.image[0] ) {
					article.image = ats.image[0].uri.replace( /[a-z]{1,1}\.(jpg|png)$/, "a.jpg" )
					if ( ats.image[0].caption && typeof ats.image[0].caption == 'string' ) {
						article.subdeck = ats.image[0].caption;
					}
				}
				article.attachments = ats;
			}
			async.waterfall(
				[
					function( callback ) {
						if ( article.image ) {
							im.identify( article.image, function(err, spec){
								if (err) {
									// Oh well. Delete the image ref, as it'll mess up the cache manifest.
									delete article.image;
									console.log( "dropped an image" );
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
		var linear = { id: editionID, pages: [] };	
		var imgCache = {};	
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

					var uniqueIDs = [], nibs = [];
					for ( s in edition.sections ) {
						var section = edition.sections[s].id;
						var articles = edition.sections[s].articles;
						for ( a in articles ) {
							var article = articles[a];
							// Avoid duplicates
							if ( ! uniqueIDs[article.id] ) {
								uniqueIDs[article.id] = 1;
								article = article.toObject();
								if ( us.include( [ 'top-stories', 'news', 'breaking-news' ], section ) ) {
									article.section = 'news';
								}
								else {
									article.section = section;
								}
								var paras;
								if ( article.articlebody ) {
									// strip links from articlebody;
									article.articlebody = article.articlebody.replace(/<a\/?[^>]*>/g,'');
									paras = article.articlebody.match(/<p>/g).length;
								}
								// Collect images for the cache manifest
								if ( article.image ) {
									imgCache[article.image] = 1;
								}
								if ( article.attachments && article.attachments.image ) {
									for ( q in article.attachments.image ) {
										var r = article.attachments.image[q];
										if ( r.uri ) {
											imgCache[r.uri] = 1;
										}
									}
								}
								// Clean up
								delete article.uri;
								delete article.id;
								// Pick up to 4 nibs...
								if ( nibs.length < 4 && paras && paras < 16 && ( ! article.image || ! article.imagelarge ) ) {
									nibs.push( article );
									//console.log( "NIB: " + article.headline );
								}
								else {
									linear.pages.push( article );
								}
							}
						}
					}
					// add nibs at page 6...
					if ( nibs.length > 0 ) {
						linear.pages.splice( 5, 0, { section: 'news', nibs: nibs } );
					}
					// Done
					callback( null );
				}

			], function (err) {
				fs.writeFile( __dirname + '/public/editions/latest.linear.json', JSON.stringify(linear), 'utf8', function(){
					if(err) {
						console.error("Could not write file: %s", err);
						process.exit(1);
					}
					console.log('Saved latest.linear to file');
					// Open the cache-manifest base file, add images, save a copy
					fs.readFile( __dirname + '/public/cache-manifest-base', 'utf8', function(err,data) {
						if(err) {
							console.error("Could not open file: %s", err);
							process.exit(1);
						}
						// Use toString on the buffer
						var out = "CACHE MANIFEST\n# " + new Date() + "\n\n"; 
						out = out + data.toString('utf8');
						for ( i in imgCache ) {
							out = out + i + "\n";
						}
						fs.writeFile( __dirname + '/public/cache-manifest', out, function(err,data) {
							if(err) {
								console.error("Could not write file: %s", err);
								process.exit(1);
							}
							console.log( 'Saved cache manifest file' );
							process.exit(code=0)
						});
					});

				});

			});
		
		});
	};

	// Routes
	/*
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

	//app.listen(8081);
	//console.log('Listening...');
	//setInterval( buildEdition, 600000 ); // 10 minutes
	*/

	buildEdition();
    
