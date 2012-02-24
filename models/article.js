const Schema = require('mongoose').Schema;  

const Article = module.exports = new Schema({ 
	uri             : { type: String, index: { unique: true } }, 
	id              : { type: Number }, 
	section         : String, 
	sectionOrder    : { type: Number }, 
	title           : String, 
	sectionheadline : String, 
	tickerheadline  : String, 
	teaser          : String, 
	teaserImg       : String, 
	byline          : String, 
	timestamp       : String, 
	articlebody     : String, 
	attachments     : {} 
}); 

