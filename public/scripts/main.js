$(document).ready( function() {

	var viewModel = {
		sections: ko.mapping.fromJS([]),
		articles: ko.mapping.fromJS([]),
		showPages: function(){
			$('#seqContentPages').slideDown();
		},
		hidePages: function(){
			$('#seqContentPages').slideUp();
		}
	};

	$.getJSON( '/api/sections', function(json){
		ko.mapping.fromJS( json.sections, viewModel.sections );
	});

	$.getJSON( '/api/section/News', function(json){
		ko.mapping.fromJS( json.articles, viewModel.articles );
	});

	ko.applyBindings( viewModel );

	setTimeout(function() { bindSwipes('seqContentPages' , 'navContentPages' ); }, 1000 );
	setTimeout(function() { bindSwipes('seqArticles' ,     'navArticles' ); }, 1000 );

});
