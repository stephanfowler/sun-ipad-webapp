const Schema = require('mongoose').Schema;  

const Edition = module.exports = new Schema({ 
	id       : { type: Number, index: { unique: true } }, 
	sections : [{
		name : String,
		id	 : String,
		articles : [{
			// From index feeds
			uri             : String,
			title           : String,
			sectionheadline : String,
			tickerheadline  : String,
			teaser          : String,
			image       	: String,
			// From single article feed, de-duped fields
			id              : String,
			byline          : String,
			timestamp       : String,
			articlebody     : String,
			attachments     : {}
		}]
	}] 
}); 
