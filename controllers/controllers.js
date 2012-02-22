exports.content = {
	getfile : function(req,res){
			var uri = url.parse(req.url).pathname;
			var filename = path.join(process.cwd(), uri);
			path.exists(filename, function(exists){
					if(!exists){
							res.writeHead(404, {"Content-Type" : "text/plain"});
							res.write("Content not found");
							res.end();
							return;
					}

					fs.readFile(filename, "binary", function(err, file){
							res.writeHead(200, {'Content-Type' : mime.lookup(filename) });
							res.write(file, "binary");
							res.end();
					});

			});
	}
}