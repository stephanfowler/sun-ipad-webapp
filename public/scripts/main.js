$(document).ready( function() {

	var viewModel = {
		sections: ko.mapping.fromJS([]),
		getEdition: function( id ) {
			if ( id ) {
				// get it	
				$.getJSON( '/api/edition/' + id , function(json){
					ko.mapping.fromJS( json.sections, viewModel.sections );
				});
			}
			else { 
				$.getJSON( '/api/edition', function(json){
					ko.mapping.fromJS( json.sections, viewModel.sections );
				});
			}
		}
	};

	viewModel.getEdition();

	ko.applyBindings( viewModel );

	viewModel.sections.subscribe(function() {

		// Bind swipe events to content pages
		setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages' ); } );

		// Apply masonry layout to content page teasers
		var flow = function() {
			$('.teasers').each( function() {
				$(this).masonry({
					itemSelector: '.teaser',
					columnWidth: 249
				});
			});
		};
		setTimeout( flow, 500 );

		$('#loading').hide();

	}, viewModel);

    $(window).bind( 'hashchange', function(e) {
		var hash = location.hash,
			section, article;

		if ( hash ) {
			var bits = hash.split( '/' );
			var section = bits[1];
			var article = bits[2];
		}

		if ( article ) {
			$( '#seqContentPages:visible' ).slideUp();
			$( '#wrap_' + section + ':hidden' ).slideDown( resetScroll );
			setTimeout(function() { bindSwipes('#cont_' + section , '#navi_' + section, article ); } );
		}
		else if ( /^[0-9]+$/.test( section ) ) {
			viewModel.getEdition( section );
		}
		else {
			$( '#seqContentPages:hidden' ).slideDown();
			$( '.wrap_articles:visible' ).slideUp();
			setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages', section ); }, 0 );
			resetScroll();
		}
		// TODO Set up an array of tab swipe objects, so that they don't have to be re-bound on each hashchange.
		// Then test how swiping changes the hash.
    });

	var resetScroll = function(){
		window.scrollTo(0,0);
	};

});
