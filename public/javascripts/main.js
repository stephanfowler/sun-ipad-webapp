$(document).ready(function(){

	var viewModel = {

		sections : ko.observableArray(),
		addSection : function ( s ) {
			if ( typeof this.sections[s] === 'undefined' ) {
				this.sections.push( { name: s } );
			};
		},

		articles : ko.observableArray(),
		addArticle : function ( a ) {
			this.articles.push( a );
		},
	}

	var getSections = function() { 
        $.getJSON( '/api/sections', function(json){
			$.each( json, function( name, articles ){
				viewModel.addSection( name );
				$.each( articles, function( i, article ){
					viewModel.addArticle( article );
				});
			});
        });
	};

	ko.applyBindings( viewModel );

	getSections();
});
