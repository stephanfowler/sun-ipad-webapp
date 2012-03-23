$(document).ready( function() {

	//if ( 0 ) {
	if ( ! window.navigator.standalone ) {
		$('#addToHomeScreen').show();
	}
	else {

		$('#pageWrap').show();

		var viewModel = {
			sections: ko.mapping.fromJS([]),
			getEdition: function( id ) {
				if ( id ) {
					var edition = '/editions/' + id + '.json?' + new Date().getTime();
					$.getJSON( edition, function(json){
						ko.mapping.fromJS( json.sections, viewModel.sections );
					});
				}
				else {
					var edition = '/editions/latest.json?' + new Date().getTime();
					$.getJSON( edition, function(json){
						$('#debug').html('Rendering...');
						ko.mapping.fromJS( json.sections, viewModel.sections );
					});
				}
			}
		};

		$('#debug').html('Downloading...');
		viewModel.getEdition();

		ko.applyBindings( viewModel );

		viewModel.sections.subscribe(function() {

			// Bind swipe events to content pages
			setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages' ); } );

			// Apply masonry layout to content page teasers
			setTimeout( function() {
				$('.teasers').each(function() {
					var teasers = $(this);
					teasers.waitForImages( function() {
						teasers.show();
						teasers.masonry({
							itemSelector: '.teaser',
							columnWidth: 249
						});
					});
				});
			});
			
			gotoHash();
			$('#debug').empty();
			$('.hideOnLoad').hide();
			$('.showOnLoad').show();

		}, viewModel);

		$(window).bind( 'hashchange', function(e) {
			gotoHash();
		});

		var gotoHash = function() {
			var hash = location.hash, section, article;
			if ( hash ) {
				var bits = hash.split( '/' );
				var section = bits[1];
				var article = bits[2];
			}
			section = section ? section : 'front';
			if ( ! $('#pageWrap').hasClass(section) ) {
				$('#pageWrap').removeClass().addClass( section );
			}

			if ( article ) {
				$( '#seqContentPages:visible' ).slideUp();
				$( '#wrap_' + section + ':hidden' ).slideDown();
				setTimeout( function() { bindSwipes('#cont_' + section , '#navi_' + section, section + '/' + article ); } );
				setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages', section ); } );
				_gaq.push(['_trackEvent', 'iPad', 'PageRead', section, parseInt(article) ]);
			}
			else {
				$( '#seqContentPages:hidden' ).slideDown();
				$( '.wrap_articles:visible' ).slideUp();
				setTimeout( function() { bindSwipes('#seqContentPages' , '#navContentPages', section ); } );
				_gaq.push(['_trackEvent', 'iPad', 'PageRead', section ]);
			}
			resetScroll();
		};

		var resetScroll = function(){
			window.scrollTo(0,0);
		};

	}
});
