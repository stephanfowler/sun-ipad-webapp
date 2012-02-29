var bindSwipes = function( ID, selectorID, initial ) {

	if ( typeof initial == 'undefined' ) initial = 0;

	// tabs
	var tabs = new Swipe( $(ID).get(0), {
		startSlide: initial,
		callback: function(event,index,elem) {
			setTab(index);
		}
	})

	var selectors = $(selectorID).children();

	selectors.each( function( i ) {
		$(this).attr( 'data-tab', i );
		$(this).click( function(e) {
			e.preventDefault();
			$( ID + ':hidden' ).slideDown();
			setTab(i);
			tabs.slide( $(this).attr('data-tab'), 500 );
		});
	});

	var setTab = function(i) {
		$(selectorID).find('.on').addClass('won');
		selectors.removeClass('on');
		selectors.eq(i).addClass('on');
	}

	setTab(initial);

/*
	var selectors = $(selectorID).get(0).children;

	for (var i = 0; i < selectors.length; i++) {
		var elem = selectors[i];
		elem.setAttribute('data-tab', i);
		elem.onclick = function(e) {
			e.preventDefault();
			$(ID).slideToggle();
			setTab(this);
			tabs.slide(parseInt(this.getAttribute('data-tab'),10),300);
		}
	}

	var setTab = function(elem) {
		for (var i = 0; i < selectors.length; i++) {
			selectors[i].className = selectors[i].className.replace('on',' ');
		}
		elem.className += ' on';
	}

	setTab(selectors[initial]);
*/

	return $(this);

};
