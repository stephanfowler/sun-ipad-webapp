$(document).ready( function() {

	var viewModel = {

		sections: ko.mapping.fromJS([]),
		section:  ko.observable('news'),

		articles: ko.mapping.fromJS([]),
		article:  ko.observable(),
	};

	/*
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
	*/

	var IDalize = function( str ) {
		return str.toLowerCase().replace( /[^a-z]+/, '' );
	};

	$.getJSON( '/api/sections', function(json){
		ko.mapping.fromJS( json.sections, viewModel.sections );
	});

	$.getJSON( '/api/section/News', function(json){
		ko.mapping.fromJS( json.articles, viewModel.articles );
	});

	viewModel.sections.subscribe(function() {
		setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages' ); }, 0 );
	}, viewModel);

	viewModel.articles.subscribe(function() {
		setTimeout( function() { bindSwipes('#seqArticles' , '#navArticles' ); } );
	}, viewModel);

	ko.applyBindings( viewModel );

    $(window).bind( 'hashchange', function(e) {
		var hash = location.hash;
		if ( hash ) {
			var bits = hash.split( '/' );
			var section = bits[1];
			var article = bits[2];
			if ( section ) {

				if ( viewModel.section() != section ) {
					//viewModel.section(section);
					//setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages', section ); } );
					// NOW LOAD THAT SECTION'S ARTICLES...
				}

				if ( article && viewModel.article() != article ) {
					//viewModel.article(article);
					//$( '#seqContentPages:visible' ).slideUp();
					setTimeout(function() { bindSwipes('#seqArticles' , '#navArticles', article ); } );
				}
				
				if ( article ) {
					$( '#seqContentPages:visible' ).slideUp();
					$( '#seqArticles:hidden'      ).slideDown();
				}
				else {
					$( '#seqContentPages:hidden' ).slideDown();
					$( '#seqArticles:visible'    ).slideUp();
				}
			}
		}
    });

});
