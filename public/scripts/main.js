require(['jquery', 'knockout-2.0.0', 'less-1.1.5.min', 'swipe.min', 'swiper' ], function($) {
        
	(function() {

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

		getSections();

		ko.applyBindings( viewModel );

		setTimeout(function() { bindSwipes('tabs' , 'tabSelector' ); }, 50 );

	})();
});

