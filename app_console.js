
	var express = require('express'),
		mongoose = require('mongoose'),
		forms = require('forms'),
		fields = forms.fields,
		validators = forms.validators;
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

	// Form
	var articleForm = forms.create({
		username: fields.string({required: true}),
	});

	app.get('/', function(req, res){
		res.render('page', { form: articleForm.toHTML() } );
	});

	app.post('/', function(req, res) {
		articleForm.handle(req, {
			success: function(form) {
				res.render('page', {
					locals: {
						title: 'Success!'
					}
				});
			},
			other: function(form) {
				res.render('page', {
					locals: {
						title: 'Failed!', 
						form: form.toHTML()
					}
				});
			}
		});
	});

	console.log( "Console listening... " );	

	app.listen(8082);

