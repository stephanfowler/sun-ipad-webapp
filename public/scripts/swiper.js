var bindSwipes = function( ID, selectorID ) {

	var initial = 0, index = 0;

	// tabs
	var tabs = new Swipe(document.getElementById( ID ), {
		startSlide: initial,
		callback: function(event,index,elem) {
			setTab(selectors[index]);
			visiblePage = index;
		}
	})

	var selectors = document.getElementById( selectorID ).children;

	for (var i = 0; i < selectors.length; i++) {
		var elem = selectors[i];
		elem.setAttribute('data-tab', i);
		elem.onclick = function(e) {
			e.preventDefault();
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

	return $(this);

};
