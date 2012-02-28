
	var edition  = "20120224";

	var express  = require('express'),
		mongoose = require('mongoose'),
		us       = require('underscore'),
		nowjs    = require("now");

	var models   = require('./models');

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

	// Mongo setup
	mongoose.connect( 'mongodb://localhost/thesun_' + edition );
	var Article = require('mongoose').model('Article');

	// Routes
	app.get('/', function(req, res){
		res.render('index.jade');
	});

	app.get('/api/article/:id', function (req, res) {
		Article.findOne({ id: Number(req.params.id) }, function( err, doc ){
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

   app.get('/api/sections', function (req, res) {
        Article.find({}, {'title':1 , 'id':1 , 'section':1 , 'teaser':1 , 'teaserImg':1, 'attachments.image':1, _id:0 }, function(err, results){
            if (err) res.writeHead(500, err.message)
            else if( !results.length ) {
                res.writeHead(404);
                res.end();
            }
            else {
				var sections = {};
                res.writeHead( 200, { 'Content-Type': 'application/json' });
                results.forEach(function(doc){
					if( typeof sections[doc.section] == 'undefined' ) {
						sections[doc.section] = [];
					};
					// Reduce the attachments to a single image 
					if ( doc.attachments.image ) {
						doc.attachments = { image: [ doc.attachments.image[0] ] };
						//doc.attachments.image[0].uri = doc.attachments.image[0].uri.replace(/a.jpg/, 'w.jpg' )
					}
					else {
						delete doc.attachments;
					}
					sections[doc.section].push( doc );
                });
                res.end( JSON.stringify( 
					{ 
						sections: us.map( sections, function( articles, section ) {
							return { name: section, articles: articles };
						}) 
					}) 
				);  
            };
        }).limit(500);
    });

   app.get('/api/section/:section', function (req, res) {
        Article.find({ section: req.params.section }, function(err, results){
            if (err) res.writeHead(500, err.message)
            else if( !results.length ) {
                res.writeHead(404);
                res.end();
            }
            else {
				var articles = [];
                res.writeHead( 200, { 'Content-Type': 'application/json' });
                results.forEach(function(doc){
					articles.push( doc );
                });
                res.end( JSON.stringify( { name: req.params.section, articles: articles } ) );  
                //console.log( JSON.stringify( articles, null, '\t' ) );  
            };
        }).limit(500);
    });

	app.listen(8080);
	console.log('listening...');

