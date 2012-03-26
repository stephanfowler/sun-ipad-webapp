
$(document).ready( function() {

	if ( 0 && ! window.navigator.standalone ) {
		$('#addToHomeScreen').show();
	}
	else {
		$('#pageWrap').show();

		var tmplNavbar  = Handlebars.compile( $('#tmplNavbar').html() );
		var tmplArticle = Handlebars.compile( $('#tmplArticle').html() );
		var tmplTeasers = Handlebars.compile( $('#tmplTeasers').html() );

		//document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);

		var
			el, i, p, k,
			page,
			prevSection = 'front',
			prevTime = new Date().getTime();

		$.getJSON( '/editions/latest.linear.json?' + new Date().getTime(), function(edition){

			// Create the teasers pages object
			var teasers = { pages: [] };
			var t = [];
			var keys = [ 'position', 'headline', 'image', 'strapline', 'teaser', 'priority' ];
			for ( i in edition.pages ) {
				edition.pages[i].position = i;
				var section = edition.pages[i].section;
				if ( ! t[section] ) {
					t[section] = [];
				}
				var p = {};
				for ( k in keys ) {
					p[ keys[k] ] = edition.pages[i][ keys[k] ];
				}
				t[section].push(p);
			}
			var n = 0;
			for ( i in t ) {
				teasers.pages.push( { isTeasers: true, position: n, section: i, teasers: t[i] } );
				n++;
			}
			//console.log( "" + JSON.stringify( teasers ) );

			// Render the navbar
			$('#navbar').html( tmplNavbar( teasers ) );

			teasersPanes  = new SwipeView('#teasersWrapper',  { numberOfPages: teasers.pages.length  });
			articlesPanes = new SwipeView('#articlesWrapper', { numberOfPages: edition.pages.length });

			var renderTeasers = function( context ){
				$('.teasers', context).waitForImages( function() {
					$(this).show();
					$(this).masonry({
						itemSelector: '.teaser',
						columnWidth: 249
					});
				});
			};

			var loadInitialPanes = function ( pages, swipeview, tmpl ) {
				for ( i=0; i<3; i++ ) {
					page = i==0 ? pages.length-1 : i-1;
					el = document.createElement('div');
					el.innerHTML = tmpl( pages[page] );
					swipeview.masterPages[i].appendChild(el)
					if( pages[page].isTeasers ) {
						renderTeasers( swipeview.masterPages[i] );
					}
				}
			}
			loadInitialPanes( teasers.pages,  teasersPanes,  tmplTeasers );
			loadInitialPanes( edition.pages, articlesPanes, tmplArticle );

			teasersPanes.onFlip( function () {
				var el, upcoming, i;
				for ( i=0; i<3; i++ ) {
					upcoming = teasersPanes.masterPages[i].dataset.upcomingPageIndex;
					if (upcoming != teasersPanes.masterPages[i].dataset.pageIndex) {
						el = teasersPanes.masterPages[i].querySelector('div');
						el.innerHTML = tmplTeasers( teasers.pages[upcoming] );
						if( teasers.pages[upcoming].isTeasers ) {
							renderTeasers();
						}
					}
				}
				var section = teasers.pages[teasersPanes.pageIndex].section;
				$('#pageWrap').removeClass().addClass( section );
				$('#navbar a.multi.on').removeClass('on').addClass('won');
				$('#navbar a.multi').eq(teasersPanes.pageIndex).removeClass('won').addClass('on');
				// GA
				var newTime = new Date().getTime();
				//_gaq.push(['_trackEvent', 'iPad', 'PageRead', prevSection, Math.floor((newTime - prevTime) / 1000) ]);
				prevTime = newTime;
				prevSection = section;
			});

			articlesPanes.onFlip( function () {
				var el, upcoming, i;
				for ( i=0; i<3; i++ ) {
					upcoming = articlesPanes.masterPages[i].dataset.upcomingPageIndex;
					if (upcoming != articlesPanes.masterPages[i].dataset.pageIndex) {
						el = articlesPanes.masterPages[i].querySelector('div');
						el.innerHTML = tmplArticle( edition.pages[upcoming] );
						if( edition.pages[upcoming].isTeasers ) {
							renderTeasers();
						}
					}
				}
				var section = edition.pages[articlesPanes.pageIndex].section;
				$('#pageWrap').removeClass().addClass( section );
				$('#currentPage #num').html( articlesPanes.pageIndex+1 );
				$('#navbar a.single.on').removeClass('on').addClass('won');
				$('#navbar a.single').eq(articlesPanes.pageIndex).removeClass('won').addClass('on');
				// GA
				var newTime = new Date().getTime();
				//_gaq.push(['_trackEvent', 'iPad', 'PageRead', prevSection, Math.floor((newTime - prevTime) / 1000) ]);
				prevTime = newTime;
				prevSection = section;
			});

			var goToArticle = function( i ) {
				$('#teasersWrapper:visible').slideUp();
				$('#articlesWrapper:hidden').slideDown();
				articlesPanes.goToPage(i);
				resetScroll();
			};

			var goToTeasers = function( i ) {
				$('#teasersWrapper:hidden').slideDown();
				$('#articlesWrapper:visible').slideUp();
				teasersPanes.goToPage(i);
				resetScroll();
			};

			var resetScroll = function() {
				$('body,html').animate({
					scrollTop: 0
				}, 300);
			};

			$('#navbar a.single').live( 'click', function(){
				goToArticle( parseInt($(this).attr('position')) );
				return false;
			});

			$('#navbar a.multi').live( 'click', function(){
				goToTeasers( parseInt($(this).attr('position')) );
				return false;
			});

			$('.teasers a').live( 'click', function(){
				goToArticle( parseInt($(this).attr('position')) );
				return false;
			});

			articlesPanes.onMoveOut(function () {
				resetScroll();
			});

			$('#navbar a.single').eq(0).addClass('on');
		});

	}
});
