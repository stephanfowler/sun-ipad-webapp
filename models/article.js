const Schema = require('mongoose').Schema;  

const Article = module.exports = new Schema({ 
	uri             : { type: String, index: { unique: true } }, 
	id              : { type: Number, index: { unique: true } },
	image           : String,
	headline        : String, 
	teaser          : String, 
	byline          : String, 
	timestamp       : String, 
	articlebody     : String, 
	attachments     : {} 
}); 

