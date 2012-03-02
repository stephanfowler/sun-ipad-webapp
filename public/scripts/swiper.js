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
			//location.hash = '#/' + id;
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
/*
*/


// non-jQuery version
/*
	var selectors = $(selectorID).get(0).children;

	for (var i = 0; i < selectors.length; i++) {
		var elem = selectors[i];
		elem.setAttribute('data-tab', i);
		elem.onclick = function(e) {
			e.preventDefault();
			$(paneID).slideToggle();
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
