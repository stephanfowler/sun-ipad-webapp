
$(document).ready( function() {

	if ( 0 && ! window.navigator.standalone ) {
		$('#addToHomeScreen').show();
	}
	else {
		$('#pageWrap').show();

		function clone(obj) {
			// Handle the 3 simple types, and null or undefined
			if (null == obj || "object" != typeof obj) return obj;

			// Handle Date
			if (obj instanceof Date) {
				var copy = new Date();
				copy.setTime(obj.getTime());
				return copy;
			}

			// Handle Array
			if (obj instanceof Array) {
				var copy = [];
				for (var i = 0, len = obj.length; i < len; ++i) {
					copy[i] = clone(obj[i]);
				}
				return copy;
			}

			// Handle Object
			if (obj instanceof Object) {
				var copy = {};
				for (var attr in obj) {
					if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
				}
				return copy;
			}

			throw new Error("Unable to copy obj! Its type isn't supported.");
		}

		var tmplNavbar  = Handlebars.compile( $('#tmplNavbar').html() );
		var tmplPage = Handlebars.compile( $('#tmplPage').html() );
		//var tmplTeasers = Handlebars.compile( $('#tmplTeasers').html() );

		//document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);

		var
			el, i, p, k,
			page,
			prevSection = 'front',
			prevTime = new Date().getTime();

		$.getJSON( '/editions/latest.linear.json?' + new Date().getTime(), function(edition){

			var teasers = { pages: [] };
			var t = [];
			var front = [];
			var keys = [ 'section', 'position', 'headline', 'image', 'strapline', 'teaser', 'priority' ];
			
			edition.pages.unshift( { section: 'news', teasers: front } );

			// Create the "teasers pages" object
			for ( i in edition.pages ) {
				edition.pages[i].position = i; // +1 because we add a front page, later...
				var section = edition.pages[i].section;
				if ( ! t[section] ) {
					t[section] = [];
				}
				var p = {};
				for ( k in keys ) {
					p[ keys[k] ] = edition.pages[i][ keys[k] ];
				}
				t[section].push(p);
				if ( i > 0 && i <= 4 ) {
					front.push( clone(p) );
				}	
			}
			var n = 0;
			for ( i in t ) {
				teasers.pages.push( { position: n, section: i, teasers: t[i] } );
				n++;
			}

			// Set front page styles
			for ( i in front ) {
				front[i].priority = 'top_' + i;
				if ( i > 0 ) {
					//delete front[i].image; 
				}
			}

			// Render the navbar
			$('#navbar').html( tmplNavbar( teasers ) );

			// Now remove the ghost front page teaser from the fist page of teasers..!	
			teasers.pages[0].teasers.shift();

			teasersPanes  = new SwipeView('#teasersWrapper',  { numberOfPages: teasers.pages.length  });
			articlesPanes = new SwipeView('#articlesWrapper', { numberOfPages: edition.pages.length });

			var renderTeasers = function( context ){
				$('.teasers', context).not('[isRendered]').waitForImages( function() {
					$(this).show();
					$(this).masonry({
						itemSelector: '.teaser',
						columnWidth: 249
					});
					$(this).attr('isRendered','1');
				});
			};

			var loadInitialPanes = function ( pages, swipeview, tmpl ) {
				for ( i=0; i<3; i++ ) {
					page = i==0 ? pages.length-1 : i-1;
					el = document.createElement('div');
					el.innerHTML = tmpl( pages[page] );
					swipeview.masterPages[i].appendChild(el)
					if( pages[page].teasers ) {
						renderTeasers( el );
					}
				}
			}
			loadInitialPanes( teasers.pages,  teasersPanes,  tmplPage );
			loadInitialPanes( edition.pages, articlesPanes, tmplPage );

			teasersPanes.onFlip( function () {
				var el, upcoming, i;
				for ( i=0; i<3; i++ ) {
					upcoming = teasersPanes.masterPages[i].dataset.upcomingPageIndex;
					if (upcoming != teasersPanes.masterPages[i].dataset.pageIndex) {
						el = teasersPanes.masterPages[i].querySelector('div');
						el.innerHTML = tmplPage( teasers.pages[upcoming] );
						if( teasers.pages[upcoming].teasers ) {
							renderTeasers( el );
						}
					}
				}
				var section = teasers.pages[teasersPanes.pageIndex].section;
				$('#pageWrap').removeClass().addClass( section );
				$('#navbar a.multi.on').removeClass('on').addClass('won');
				$('#navbar a.multi').eq(teasersPanes.pageIndex).removeClass('won').addClass('on');
				// GA
				var newTime = new Date().getTime();
				_gaq.push(['_trackEvent', 'iPad', 'PageRead', prevSection, Math.floor((newTime - prevTime) / 1000) ]);
				prevTime = newTime;
				prevSection = section;
			});

			articlesPanes.onFlip( function () {
				var el, upcoming, i;
				for ( i=0; i<3; i++ ) {
					upcoming = articlesPanes.masterPages[i].dataset.upcomingPageIndex;
					if (upcoming != articlesPanes.masterPages[i].dataset.pageIndex) {
						el = articlesPanes.masterPages[i].querySelector('div');
						el.innerHTML = tmplPage( edition.pages[upcoming] );
						if( edition.pages[upcoming].teasers ) {
							renderTeasers();
						}
					}
				}
				var section = edition.pages[articlesPanes.pageIndex].section;
				if ( 0 == articlesPanes.pageIndex ) {
					$('#pageWrap').removeClass().addClass( 'front' );
				}
				else {
					$('#pageWrap').removeClass().addClass( section );
				}
				$('#currentPage #num').html( articlesPanes.pageIndex+1 );
				$('#navbar a.single.on').removeClass('on').addClass('won');
				$('#navbar a.single').eq(articlesPanes.pageIndex).removeClass('won').addClass('on');
				// GA
				var newTime = new Date().getTime();
				_gaq.push(['_trackEvent', 'iPad', 'PageRead', prevSection, Math.floor((newTime - prevTime) / 1000) ]);
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

			var today_date= new Date()
			var month=today_date.getMonth()
			var today=today_date.getDate()
			var year=today_date.getFullYear()
			var months = new Array(
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December"
			);
			$('#todayis').html( months[month] + " " + today + ", " + year );

			// last minute tweaks!
			$('#navbar a.single').eq(0).addClass('on');
			$('#teasersWrapper:visible').slideUp();
		});

	}
});
