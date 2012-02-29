$(document).ready( function() {

	var initial = 0;

	var viewModel = {

		sections:  ko.mapping.fromJS([]),
		sectionOn: ko.observable(initial),
		
		articles:  ko.mapping.fromJS([]),
		articleOn: ko.observable(0),

		showPages: function(){
			$('#seqContentPages').slideDown();
		},
		hidePages: function(){
			$('#seqContentPages').slideUp();
		},

		sectionShift: function(){
			var n = this.sectionOn();
			var l = this.sections().length;
			this.sectionOn( ( n + 1 ) % l );
		}
	};

	var addIndexes = function( tasks ) {
		for (var i = 0, j = tasks.length; i < j; i++) {
		   var task = tasks[i];
			if (!task.index) {
			   task.index = ko.observable(i);  
			} else {
			   task.index(i);   
			}
		}
	};

	$.getJSON( '/api/sections', function(json){
		ko.mapping.fromJS( json.sections, viewModel.sections );
	});

	viewModel.sectionOn.subscribe(function() {
		setTimeout(function() { bindSwipes('#seqContentPages' , '#navContentPages', viewModel.sectionOn() ); }, 0 );
	}, viewModel);

	viewModel.sections.subscribe(function() {
		addIndexes( this.sections() );
		setTimeout(function() { bindSwipes('#seqContentPages' , '#navContentPages', viewModel.sectionOn() ); }, 0 );
	}, viewModel);


	$.getJSON( '/api/section/News', function(json){
		ko.mapping.fromJS( json.articles, viewModel.articles );
	});

	viewModel.articleOn.subscribe(function() {
		setTimeout(function() { bindSwipes('#seqArticles' , '#navArticles', viewModel.articleOn() ); }, 0 );
	}, viewModel);

	viewModel.articles.subscribe(function() {
		addIndexes( this.articles() );
		setTimeout(function() { bindSwipes('#seqArticles' , '#navArticles', viewModel.articleOn() ); }, 0 );
	}, viewModel);

	ko.applyBindings( viewModel );


});
