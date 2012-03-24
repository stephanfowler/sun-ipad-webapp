	var tmplNavi    = Handlebars.compile( $('#tmplNavi').html() );
	var tmplArticle = Handlebars.compile( $('#tmplArticle').html() );

//	document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);

	var	gallery,
		el,
		i,
		page,
		dots = document.querySelectorAll('#nav li');

	$.getJSON( '/editions/latest.linear.json?' + new Date().getTime(), function(edition){

		$('#navi_articles').html( tmplNavi( edition ) );
		$('#navi_articles a').eq(0).addClass('on');
		$('#navi_articles a').live( 'click', function(){
			gallery.goToPage( $(this).index() );
		});

		gallery = new SwipeView('#wrapper', { numberOfPages: edition.articles.length });

		// Load initial data
		setTimeout( function(){
			for (i=0; i<3; i++) {
				page = i==0 ? edition.articles.length-1 : i-1;
				el = document.createElement('div');
				el.innerHTML = tmplArticle( edition.articles[page] );
				gallery.masterPages[i].appendChild(el)
			}
		});

		gallery.onFlip(function () {
			var el, upcoming, i, hasMoved = false;
			for (i=0; i<3; i++) {
				upcoming = gallery.masterPages[i].dataset.upcomingPageIndex;
				if (upcoming != gallery.masterPages[i].dataset.pageIndex) {
					el = gallery.masterPages[i].querySelector('div');
					el.innerHTML = tmplArticle( edition.articles[upcoming] );
				}
			}
			$('#currentPage #num').html( gallery.pageIndex+1 );
			$('#navi_articles a.on').removeClass().addClass('won');
			$('#navi_articles a').eq(gallery.pageIndex).removeClass().addClass('on');
		});

		gallery.onMoveOut(function () {
			$('body,html').animate({
				scrollTop: 0
			}, 800);
		});
	});
