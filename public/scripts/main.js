$(document).ready( function() {

	if ( 0 && ! window.navigator.standalone ) {
		$('#addToHomeScreen').show();
	}
	else {
		$('#pageWrap').show();

		// Object cloner
		function clone(obj) {
			if (null == obj || "object" != typeof obj) return obj;
			if (obj instanceof Date) {
				var copy = new Date();
				copy.setTime(obj.getTime());
				return copy;
			}
			if (obj instanceof Array) {
				var copy = [];
				for (var i = 0, len = obj.length; i < len; ++i) {
					copy[i] = clone(obj[i]);
				}
				return copy;
			}
			if (obj instanceof Object) {
				var copy = {};
				for (var attr in obj) {
					if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
				}
				return copy;
			}
			throw new Error("Unable to copy obj! Its type isn't supported.");
		}

		function NoClickDelay(el) {
			this.element = typeof el == 'object' ? el : document.getElementById(el);
			if( window.Touch ) this.element.addEventListener('touchstart', this, false);
		}

		NoClickDelay.prototype = {
			handleEvent: function(e) {
				switch(e.type) {
					case 'touchstart': this.onTouchStart(e); break;
					case 'touchmove': this.onTouchMove(e); break;
					case 'touchend': this.onTouchEnd(e); break;
				}
			},

			onTouchStart: function(e) {
				e.preventDefault();
				this.moved = false;

				this.theTarget = document.elementFromPoint(e.targetTouches[0].clientX, e.targetTouches[0].clientY);
				if(this.theTarget.nodeType == 3) this.theTarget = theTarget.parentNode;
				this.theTarget.className+= ' pressed';

				this.element.addEventListener('touchmove', this, false);
				this.element.addEventListener('touchend', this, false);
			},

			onTouchMove: function(e) {
				this.moved = true;
				this.theTarget.className = this.theTarget.className.replace(/ ?pressed/gi, '');
			},

			onTouchEnd: function(e) {
				this.element.removeEventListener('touchmove', this, false);
				this.element.removeEventListener('touchend', this, false);

				if( !this.moved && this.theTarget ) {
					this.theTarget.className = this.theTarget.className.replace(/ ?pressed/gi, '');
					var theEvent = document.createEvent('MouseEvents');
					theEvent.initEvent('click', true, true);
					this.theTarget.dispatchEvent(theEvent);
				}

				this.theTarget = undefined;
			}
		};
		new NoClickDelay(document.getElementById('navbar'));

		var
			el, i, p, q, k,
			page,
			prevSection = 'front',
			prevTime = new Date().getTime();
		var tmplNavbar  = Handlebars.compile( $('#tmplNavbar').html() );
		var tmplPage = Handlebars.compile( $('#tmplPage').html() );

		//$.getJSON( '/editions/latest.linear.json?' + new Date().getTime(), function(edition){
		$.getJSON( '/editions/latest.linear.json', function(edition){

			var teasers = { pages: [] };
			var t = [];
			var front = [];
			var keys = [ 'section', 'position', 'headline', 'image', 'strapline', 'teaser', 'priority' ];
			
			edition.pages.unshift( { section: 'news', teasers: front } );
			edition.pages.splice( 7, 0, { section: 'ad', adlink:'http://www.britishgas.co.uk/', adportrait: '/ads/1_portrait.jpg', adlandscape: '/ads/1_landscape.jpg'  } );

			// Create the "teasers pages" object
			for ( i in edition.pages ) {
				edition.pages[i].position = i; // +1 because we add a front page, later...
				var section = edition.pages[i].section;
				if ( section != 'ad' ) {
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
			}
			var n = 0;
			for ( i in t ) {
				t[i][0].priority = 'top';
				t[i][1].priority = 'top';
				teasers.pages.push( { position: n, section: i, teasers: t[i] } );
				n++;
			}

			// Set front page styles
			for ( i in front ) {
				front[i].priority = 'top_' + i;
			}
			//front.push( { headline: "Britain's most popular paper", priority: "britainsMostpopular" } )

			// Render the navbar
			$('#navbar').html( tmplNavbar( teasers ) );

			// Now remove the ghost front page teaser from the fist page of teasers..!	
			teasers.pages[0].teasers.shift();

			teasersPanes  = new SwipeView('#teasersWrapper',  { numberOfPages: teasers.pages.length  });
			articlesPanes = new SwipeView('#articlesWrapper', { numberOfPages: edition.pages.length });

			var renderExtras = function( context ){
				$('.teasers', context).not('[isRendered]').waitForImages( function() {
					$(this).show();
					$(this).masonry({
						itemSelector: '.teaser',
						columnWidth: 249
					});
					$(this).attr('isRendered','1');
				});
				// Shuffle images between article paragraphs
				var numP = $('.articlecontent p', context).length;
				var numImgs  = $('.articlecontent img.pull', context).length;
				var per = Math.ceil( ( numP - 2 ) / ( numImgs + 1 ) );
				$('.articlecontent img.pull', context).each( function( i, el ){
					var pull = $(this).detach();
					if ( i > 0 ) { // first image is already used in the header
						
						$('.articlecontent p', context).eq( (i-1)*per ).after( pull );
					}
				});
			};

			var loadInitialPanes = function ( pages, swipeview, tmpl ) {
				for ( i=0; i<3; i++ ) {
					page = i==0 ? pages.length-1 : i-1;
					el = document.createElement('div');
					el.innerHTML = tmpl( pages[page] );
					swipeview.masterPages[i].appendChild(el)
					renderExtras( el );
				}
			}

			loadInitialPanes( teasers.pages, teasersPanes,  tmplPage );
			loadInitialPanes( edition.pages, articlesPanes, tmplPage );

			teasersPanes.onFlip( function () {
				var el, upcoming, i;
				for ( i=0; i<3; i++ ) {
					upcoming = teasersPanes.masterPages[i].dataset.upcomingPageIndex;
					if (upcoming != teasersPanes.masterPages[i].dataset.pageIndex) {
						el = teasersPanes.masterPages[i].querySelector('div');
						el.innerHTML = tmplPage( teasers.pages[upcoming] );
						renderExtras( el );
					}
				}
				var section = teasers.pages[teasersPanes.pageIndex].section;
				window.location.hash = '#/' + section + '/' + teasersPanes.pageIndex;
				$('#pageWrap').removeClass().addClass( section );
				$('#navbar a.multi.on').removeClass('on');
				$('#navbar a.multi').eq(teasersPanes.pageIndex).addClass('on');
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
						renderExtras( el );
					}
				}
				var section = edition.pages[articlesPanes.pageIndex].section;
				window.location.hash = '#/' + articlesPanes.pageIndex;
				if ( 0 == articlesPanes.pageIndex ) {
					$('#pageWrap').removeClass().addClass( 'front' );
				}
				else {
					$('#pageWrap').removeClass().addClass( section );
				}
				$('#currentPage #num').html( articlesPanes.pageIndex+1 );
				$('#navbar a.multi.on').removeClass('on');
				$('#navbar .singles a.on').removeClass('on').addClass('won');
				$('#navbar .singles a').eq(articlesPanes.pageIndex).removeClass('won').addClass('on');
				// GA
				var newTime = new Date().getTime();
				_gaq.push(['_trackEvent', 'iPad', 'PageRead', prevSection, Math.floor((newTime - prevTime) / 1000) ]);
				prevTime = newTime;
				prevSection = section;
			});

			var goToArticle = function( i ) {
				$('#teasersWrapper').fadeOut();
				$('#articlesWrapper').fadeIn();
				articlesPanes.goToPage(i);
				resetScroll();
			};

			var goToTeasers = function( i ) {
				$('#teasersWrapper').fadeIn();
				$('#articlesWrapper').fadeOut();
				teasersPanes.goToPage(i);
				resetScroll();
			};

			var resetScroll = function() {
				$('body,html').animate({
					scrollTop: 0
				}, 300);
			};

			var gotoHash = function() {
				var hash = location.hash;
				if ( hash ) {
					var bits = hash.split( '/' );
					if ( parseInt( bits[2] ) > -1 ) {
						goToTeasers( parseInt( bits[2] ) );
					}
					else if ( parseInt( bits[1] ) > -1 ) {
						goToArticle( parseInt( bits[1] ) );
					}
					else {
						goToArticle( 0 );
					}
				}
				else {
					goToArticle( 0 );
				}
			};
			$(window).bind( 'hashchange', function() {
				gotoHash();
			});
			gotoHash();

			articlesPanes.onMoveOut(function () {
				resetScroll();
			});

			var today = new Date()
			var month = today.getMonth();
			var wkDay = today.getDay();
			var day   = today.getDate();
			var year  = today.getFullYear();
			var days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
			var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
			$('#todayis').html( days[wkDay] + ", " + months[month] + " " + day + ", " + year );

			var olympics = new Date( 2012, 6, 27 );
			//if ( today < olympics ) {
				var one_day=1000*60*60*24 // 1 day in milliseconds
				$('#logomessage').html( Math.ceil( ( olympics.getTime() - today.getTime() ) / (one_day) ) + " days to go" );
			//}

			// last minute tweaks!
			$('#navbar .singles a').eq(0).addClass('on');

		});

	}
});
