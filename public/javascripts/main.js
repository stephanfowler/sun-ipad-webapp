$(document).ready(function(){

	var msg = function( name, message ) {
		this.name = ( name == now.name ? 'Me' : name);
		this.message = message;
		this.ditch = function() { viewModel.messages.remove(this) };
	}	

	var viewModel = { 
		user : ko.observable(),
		setUser : function() {
			now.name = $("#username-input").val();
			this.user( now.name );
			now.distributeMessage( '', true );
			$("#text-input").focus();
		},
		messages : ko.observableArray(),
		addMessage : function ( name, message ) {
			this.messages.unshift( new msg( name, message ) );
			if ( this.messages().length > 10 ) {
				this.messages.pop();
			}
		},
		sendMessage : function(){
			if ( document.getElementById("text-input").value ) {
				now.distributeMessage( $("#text-input").val() );
				$("#text-input").val("").focus();
			}
		}
	}

	now.ready( function() {
		now.receiveMessage = function(name, message){				
			viewModel.addMessage( name, message );
		};
		now.receiveHistory = function( msgHistory ){				
			for ( var m in msgHistory ) {
				viewModel.addMessage( msgHistory[m].name, msgHistory[m].message );
			}
		};
		now.sendHistory();
	});

	ko.applyBindings( viewModel );

	$("#username-input").focus();
});
