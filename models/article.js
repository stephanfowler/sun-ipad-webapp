const Schema = require('mongoose').Schema;  

const Article = module.exports = new Schema({ 
	uri             : { type: String, index: { unique: true } }, 
	id              : { type: Number, index: { unique: true } },
	euid            : Number,
	isTop           : Number,
	image           : String,
	imagelarge      : Boolean,
	imageportrait   : Boolean,
	headline        : String, 
	strapline       : String, 
	subdeck         : String,
	bylineimage     : String,
	quote           : String, 
	teaser          : String, 
	byline          : String, 
	bylineimage     : String,
	timestamp       : String, 
	articlebody     : String, 
	attachments     : {} 
}); 

