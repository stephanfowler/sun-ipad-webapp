const Schema = require('mongoose').Schema;  

const Edition = module.exports = new Schema({ 
	id       : { type: String, index: { unique: true } }, 
	sections : [{
		name : String,
		id	 : String,
		articles : [{
			uri             : String,
			title           : String,
			sectionheadline : String,
			tickerheadline  : String,
			teaser          : String,
			image       	: String
		}]
	}] 
}); 
