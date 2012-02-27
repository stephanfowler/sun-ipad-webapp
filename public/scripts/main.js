$(document).ready( function() {

	var viewModel = {
		sections: ko.mapping.fromJS([])
	};

	$.getJSON( '/api/sections', function(json){
		ko.mapping.fromJS( json.sections, viewModel.sections );
	});

	ko.applyBindings( viewModel );

	setTimeout(function() { bindSwipes('tabs' , 'tabSelector' ); }, 1000 );

});
