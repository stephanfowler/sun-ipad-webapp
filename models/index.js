const mongoose = require('mongoose');

mongoose.model('Edition', require('./edition'));
mongoose.model('Article', require('./article'));
