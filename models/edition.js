const Schema = require('mongoose').Schema;  

const Edition = module.exports = new Schema({ 
	id       : { type: Number, index: { unique: true } }, 
	sections : [{
		name : String,
		id	 : String,
		articles : {}
	}] 
}); 
