QuestionProvider = function(host, port) {
	this.db = new Db('IRCLogin', new Server(host, port, {
		auto_reconnect : true
	}, {}));
	this.db.open(function() {
	});
};

QuestionProvider.prototype.getCollection = function(callback) {
	this.db.collection('questions', function(error, question_collection) {
		if (error)
			callback(error);
		else
			callback(null, question_collection);
	});
};

QuestionProvider.prototype.findAll = function(callback) {
	this.getCollection(function(error, question_collection) {
		if (error)
			callback(error)
		else {
			question_collection.find().sort({
				created_at : -1
			}).toArray(function(error, results) {
				if (error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
};

QuestionProvider.prototype.findById = function(id, callback) {
	this.getCollection(function(error, question_collection) {
		if (error)
			callback(error)
		else {
			question_collection.findOne({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, function(error, result) {
				if (error)
					callback(error)
				else
					callback(null, result)
			});
		}
	});
}

QuestionProvider.prototype.getFollowers = function(id, callback) {
	this.getCollection(function(error, question_collection) {
		if (error)
			callback(error)
		else {
			question_collection.find({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, {
				followers : 1
			}).toArray(function(error, results) {
				if (error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
}

QuestionProvider.prototype.findAllAnswers = function(id, callback) {
	this.getCollection(function(error, question_collection) {
		if (error)
			callback(error)
		else {
			question_collection.find({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, {
				answers : 1
			}).toArray(function(error, results) {
				if (error)
					callback(error)
				else
					callback(null, results)
			});
		}
	});
};

QuestionProvider.prototype.save = function(question, callback) {
	var db = this.db;
	this.getCollection(function(error, question_collection) {
		if (error)
			callback(error)
		else {

			question.created_at = new Date();
			if (question.answers === undefined)
				question.answers = [];
			for (var j = 0; j < question.answers.length; j++) {
				question.answers[j].created_at = new Date();
			}

			question_collection.insert(question, function() {
				callback(null, question);
			});
			if (question.tags === undefined)
				question.tags = [];
			if (question.tags != undefined) {
				recurseTags(db, question.tags);
			}
		}
	});
};

function recurseTags(db, tags) {
	if (tags.length == 1) {
		db.collection('tags', function(error, tag_collection) {
			tag_collection.insert({
				tag : tags[0]
			});
		})
	} else {
		db.collection('tags', function(error, tag_collection) {
			tag_collection.insert({
				tag : tags[0]
			});
			tags.splice(0, 1);
			recurseTags(db, tags);
		})
	}
}

exports.QuestionProvider = QuestionProvider;
