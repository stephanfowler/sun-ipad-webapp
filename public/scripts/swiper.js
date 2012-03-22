var bindSwipes = function( paneID, selectorID, initialID ) {

	var index = 0;
	if ( initialID ) {
		var target = document.getElementById( initialID );
		if ( target ) {
			index = $(selectorID).children().index(target);
		}
	}

	var tabs = new Swipe( $(paneID).get(0), {
		startSlide: index,
		callback: function(event,i,elem) {
			setTab(i);
			var id = selectors.eq(i).attr('id');
			elem.scrollTop = 0;
		}
	})

	var selectors = $(selectorID).children();

	selectors.each( function( i ) {
		$(this).attr( 'data-tab', i );
		$(this).click( function(e) {
			setTab(i);
			tabs.slide( $(this).attr('data-tab'), 500 );
		});
	});

	var setTab = function(i) {
		$(selectorID).find('.on').addClass('won');
		selectors.removeClass('on');
		selectors.eq(i).addClass('on');
	}

	setTab(index);

	return $(this);
};
