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

		gallery = new SwipeView('#wrapper', { numberOfPages: edition.pages.length });

		// Load initial data
		setTimeout( function(){
			for (i=0; i<3; i++) {
				page = i==0 ? edition.pages.length-1 : i-1;
				el = document.createElement('div');
				el.innerHTML = tmplArticle( edition.pages[page] );
				gallery.masterPages[i].appendChild(el)
				if( edition.pages[page].isTeasers ) {
					renderTeasers();
				}
			}
		});

		var renderTeasers = function(){
			$('.teasers').waitForImages( function() {
				$(this).show();
				$(this).masonry({
					itemSelector: '.teaser',
					columnWidth: 249
				});
			});
		};

		gallery.onFlip(function () {
			var el, upcoming, i, hasMoved = false;
			for (i=0; i<3; i++) {
				upcoming = gallery.masterPages[i].dataset.upcomingPageIndex;
				if (upcoming != gallery.masterPages[i].dataset.pageIndex) {
					el = gallery.masterPages[i].querySelector('div');
					el.innerHTML = tmplArticle( edition.pages[upcoming] );
					if( edition.pages[upcoming].isTeasers ) {
						renderTeasers();
					}
				}
			}
			$('#currentPage #num').html( gallery.pageIndex+1 );
			$('#navi_articles a.on').removeClass().addClass('won');
			$('#navi_articles a').eq(gallery.pageIndex).removeClass().addClass('on');
		});

		var resetScroll = function() {
			$('body,html').animate({
				scrollTop: 0
			}, 300);
		};

		$('#navi_articles a').eq(0).addClass('on');

		$('#navi_articles a').live( 'click', function(){
			gallery.goToPage( $(this).index() );
			resetScroll();
			return false;
		});

		$('.teasers a').live( 'click', function(){
			gallery.goToPage(parseInt($(this).attr('position')));
			resetScroll();
			return false;
		});

		gallery.onMoveOut(function () {
			resetScroll();
		});

	});
