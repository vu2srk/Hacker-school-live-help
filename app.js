/**
 * Module dependencies.
 */

Db = require('mongodb').Db;
Connection = require('mongodb').Connection;
Server = require('mongodb').Server;
BSON = require('mongodb').BSON;
ObjectID = require('mongodb').ObjectID;
md = require("markdown-js").Markdown;

basket = {};

var express = require('express'), routes = require('./routes'), connect = require('express/node_modules/connect'), _ = require('underscore'), jade = require('jade'), parseCookie = connect.utils.parseCookie, MemoryStore = connect.middleware.session.MemoryStore, store;

var UserProvider = require('./userProvider').UserProvider;
var QuestionProvider = require('./questionProvider').QuestionProvider;
var TagProvider = require('./tagProvider').TagProvider;

var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.set('view options', {
		pretty : true
	});
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({
		secret : 'secret',
		key : 'express.sid',
		store : store = new MemoryStore()
	}));
	app.use(require('stylus').middleware({
		src : __dirname + '/public'
	}));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function() {
	app.use(express.errorHandler({
		dumpExceptions : true,
		showStack : true
	}));
});

app.configure('production', function() {
	app.use(express.errorHandler());
});

var userProvider = new UserProvider('localhost', 27017);
var questionProvider = new QuestionProvider('localhost', 27017);
var tagProvider = new TagProvider('localhost', 27017);

// Routes

function time_stamp(date_time) {
	//to get unix timestamp
	var currentDate = Math.round(+new Date() / 1000);
	var tweetDate = Math.round(+new Date(date_time) / 1000);
	//alert(tweetDate);
	var diffTime = currentDate - tweetDate;
	//alert(diffTime);
	if (diffTime < 59)
		return 'less than a minute ago';
	else if (diffTime > 59 && diffTime < 120)
		return 'about a minute ago';
	else if (diffTime >= 121 && diffTime <= 3600)
		return (parseInt(diffTime / 60)).toString() + ' minutes ago';
	else if (diffTime > 3600 && diffTime < 7200)
		return '1 hour ago';
	else if (diffTime > 7200 && diffTime < 86400)
		return (parseInt(diffTime / 3600)).toString() + ' hours ago';
	else if (diffTime > 86400 && diffTime < 172800)
		return '1 day ago';
	else if (diffTime > 172800 && diffTime < 604800)
		return (parseInt(diffTime / 86400)).toString() + ' days ago';
	else if (diffTime > 604800 && diffTime < 12089600)
		return '1 week ago';
	else if (diffTime > 12089600 && diffTime < 2630880)
		return (parseInt(diffTime / 604800)).toString() + ' weeks ago';
	else if (diffTime > 2630880 && diffTime < 5261760)
		return '1 month ago';
	else if (diffTime > 5261760 && diffTime < 31570560)
		return (parseInt(diffTime / 2630880)).toString() + ' months ago';
	else if (diffTime > 31570560 && diffTime < 63141120)
		return '1 year ago';
	else
		return (parseInt(diffTime / 31570560)).toString() + ' years ago';
}

function check_auth(req, res, next) {

	//  if the user isn't logged in, requestion, namedirect them to a login page
	if (!req.session.email) {
		res.redirect("/");
		return;
		// the buck stops here... we do not call next(), because
		// we don't want to proceed; instead we want to show a login page
	}

	//  the user is logged in, so call next()
	next();
}

function constructQuestion(name, question, username) {
	var returnString = "<a>" + name + "</a> : " + question.question + "<div class='qActions'>";
	var followerFound = 0;
	if (question.followers != null) {
		followers = question.followers;
		for (var i = 0; i < followers.length; i++) {
			if (followers[i].follower == username && username != question.asker) {
				returnString += "<div class='qActions'><a id='" + question._id + "_follow' onClick='unfollowQuestion(\"" + question._id + "\")' class='qAction'>Unfollow</a> |";
				followerFound = 1;
				break;
			}
		}
	}
	if (followerFound == 0 && username != question.asker) {
		returnString += "<a id='" + question._id + "_follow' onClick='followQuestion(\"" + question._id + "\")' class='qAction'>Follow</a> |";
	}

	returnString += "<a id='" + question._id + "_popout' onClick='getReplies(\"" + question._id + "\")' class='qAction'>Expand Replies </a> | <a id='" + question._id + "_reply' onClick='openGuider(\"" + question._id + "\")' class='qAction'>Reply</a> |";

	if (username == question.asker) {
		returnString += " <a id='" + question._id + "_delete' onClick='openDeletePrompt(\"" + question._id + "\")' class='qAction'>Delete</a> |";
	}

	return returnString + "<font class=qAction>" + question.created_at + "</font></div>";
}

function makeURLClickable(text) {
	var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
	return text.replace(exp, "[$1]($1)");
}

app.get('/', routes.index);

app.get('/home', routes.home);

app.get('/questions', check_auth, function(req, res) {
	questionProvider.findAll(function(error, qs) {
		questionBook = [];
		if (qs.length > 0) {
			recurseQuestionsJSON(qs, questionBook, res, req.session.name, req.session.email);
		} else {
			res.render('questions', {
				locals : {
					title : 'Questions',
					name : req.session.name,
					questions : [],
					md : md
				}
			});
		}
	});
});

function isFollower(question, username) {
	if (question.followers != null) {
		followers = question.followers;
		for (var i = 0; i < followers.length; i++) {
			if (followers[i].follower == username && username != question.asker) {
				return true;
			}
		}
	}
	return false;
}

function isAsker(question, username) {
	if (question.asker == username) {
		return true;
	}
	return false;
}

function recurseQuestionsJSON(qs, questionBook, res, userName, email) {
	var answers = [];
	var isUserFollower = 0;
	var isUserAsker = 0;
	if (qs.length == 1) {
		console.log(qs);
		userProvider.findByUsername(qs[0].asker, function(error, user) {

			allAnswers = qs[0].answers;
			//if (allAnswers.length > 0) {

			var qId = qs[0]._id;
			recurseAnswers(allAnswers, answers, qId, function() {
				if (isFollower(qs[0], email))
					isUserFollower = 1;

				if (isAsker(qs[0], email))
					isUserAsker = 1;

				questionBook.push({
					id : qs[0]._id,
					title : makeURLClickable(qs[0].question),
					time : time_stamp(qs[0].created_at),
					username : user.email,
					topics : qs[0].tags,
					answers : answers,
					follower : isUserFollower,
					asker : isUserAsker
				});

				res.render('questions', {
					locals : {
						title : 'Questions',
						name : email,
						questions : questionBook
					}
				});
			});
			//}
		});
	} else {
		userProvider.findByUsername(qs[0].asker, function(error, user) {
			console.log(qs[0]);
			allAnswers = qs[0].answers;
			//if (allAnswers.length > 0) {
			var qId = qs[0]._id;
			recurseAnswers(allAnswers, answers, qId, function() {
				var date = new Date(qs[0].created_at);

				if (isFollower(qs[0], email))
					isUserFollower = 1;

				if (isAsker(qs[0], email))
					isUserAsker = 1;

				questionBook.push({
					id : qs[0]._id,
					title : makeURLClickable(qs[0].question),
					time : time_stamp(qs[0].created_at),
					username : user.email,
					topics : qs[0].tags,
					answers : answers,
					follower : isUserFollower,
					asker : isUserAsker
				});

				qs.splice(0, 1);
				recurseQuestionsJSON(qs, questionBook, res, userName, email);
			});
			//}
		});
	}
}

function recurseAnswers(allAnswers, answers, id, callback) {
	if (allAnswers.length > 0) {
		if (allAnswers.length == 1) {
			console.log(allAnswers);
			userProvider.findByUsername(allAnswers[0].answerer, function(error, user) {
				if (user != null) {
					answer = allAnswers[0].answer;
					answers.push({
						text : makeURLClickable(answer),
						time : time_stamp(allAnswers[0].created_at),
						user : user.email
					});
					return callback();
				}
			});
			
		} else {
			userProvider.findByUsername(allAnswers[0].answerer, function(error, user) {
				console.log(allAnswers[0]);
				if (user != null) {
					answer = allAnswers[0].answer;
					allAnswers.splice(0, 1);
					answers.push({
						text : makeURLClickable(answer),
						time : time_stamp(allAnswers[0].created_at),
						user : user.email
					});
					recurseAnswers(allAnswers, answers, id, callback);
				}
			});
		}
	} else {
		return callback();
	}
}

app.post('/logout', function(req, res) {
	userProvider.loggedOut(req.session.email);
	req.session.email = null;
	req.session.name = null;
	req.session.destroy();
	res.redirect("/");
})

app.get('/typeahead', function(req, res) {
	tagProvider.findAll(function(error, results) {
		res.send(_.compact(_.pluck(results, "tag")));
	});
});

app.post('/login', function(req, res) {
	userProvider.findByUsername(req.param("email"), function(error, user) {
		if (user != null) {
			if (user.email == "") {
				console.log("incorrect");
				res.redirect('/');
			} else if (req.param("password") == user.password) {
				console.log("correct");
				req.session.email = user.email;
				req.session.name = user.name.first + " " + user.name.last;
				userProvider.loggedIn(user.email);
				res.redirect('/questions');
			} else {
				console.log(user.password[0] + " = " + req.param("password") + " incorrect password");
				res.redirect("/");
			}
		} else {
			res.redirect("/");
		}
	});
});

app.get('/newUser', routes.newUser);

app.post('/register', function(req, res) {
	userProvider.save({
		name : {
			first : req.param('fname'),
			last : req.param('lname')
		},
		email : req.param('email'),
		password : req.param('password')
	}, function(errors, users) {
		res.redirect('/');
	})
});

app.listen(8080, function() {
	console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

var io = require("socket.io").listen(app);

io.set('authorization', function(data, accept) {
	if (!data.headers.cookie)
		return accept('No cookie transmitted.', false);

	data.cookie = parseCookie(data.headers.cookie);
	data.sessionID = data.cookie['express.sid'];

	store.load(data.sessionID, function(err, session) {
		if (err || !session)
			return accept('Error', false);

		data.session = session;
		return accept(null, true);
	});
})
function renderHTML(pathToTemplate, locals) {
	pathToTemplate = require('path').resolve(__dirname, './views') + "/" + pathToTemplate;
	var template = require('fs').readFileSync(pathToTemplate, 'utf8');
	var jadeFn = jade.compile(template, {
		filename : pathToTemplate,
		pretty : true
	});
	return jadeFn(locals);
}

io.sockets.on('connection', function(socket) {

	var sess = socket.handshake.session;

	basket[sess.email] = socket.id;

	socket.on('question', function(msg, topics) {
		var tags = /#[a-zA-Z0-9]+\s?/g;
		msg = msg.replace(/<(?:.|\n)*?>/gm, '');
		if (topics.trim() != "")
			topics_array = topics.split(",");
		else
			topics_array = [];
		var matches = msg.match(tags) || [];
		if (matches != null) {
			for (var i = 0; i < matches.length; i++) {
				matches[i] = matches[i].replace("#", "");
				msg = msg.replace("#" + matches[i], matches[i]);
			}
		}

		var allTags = _.union(matches, topics_array);

		questionProvider.save({
			question : msg,
			asker : sess.email,
			tags : allTags,
			followers : [{
				follower : sess.email
			}]
		}, function(error, question) {
			var renderedTemplateToSender = renderHTML("question_details.jade", {
				question : {
					id : question._id,
					title : makeURLClickable(question.question),
					time : time_stamp(question.created_at),
					username : sess.email,
					topics : question.tags,
					answers : [],
					follower : 1,
					asker : 1
				}
			});
			var renderedTemplateToAll = renderHTML("question_details.jade", {
				question : {
					id : question._id,
					title : makeURLClickable(question.question),
					time : time_stamp(question.created_at),
					username : sess.email,
					topics : question.tags,
					answers : [],
					follower : 0,
					asker : 0
				}
			});
			socket.broadcast.emit('this', renderedTemplateToAll, question._id);
			io.sockets.socket(socket.id).emit('this', renderedTemplateToSender, question._id);
		})
	});

	socket.on('answer', function(answer, id) {
		var msg = answer;
		//var tags = /#[a-zA-Z0-9]+\s?/g;
		msg = msg.replace(/<(?:.|\n)*?>/gm, '');
		/*var matches = msg.match(tags);
		 if (matches!=null){
		 for (var i=0;i<matches.length;i++){
		 matches[i] = matches[i].replace("#","");
		 msg = msg.replace("#"+matches[i], matches[i]);
		 }
		 }*/
		answer = msg;
		questionProvider.getCollection(function(error, question_collection) {
			question_collection.update({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, {
				$push : {
					answers : {
						answer : answer,
						answerer : sess.email,
						created_at : new Date()
					}
				}
			}, function() {
				userProvider.findByUsername(sess.email, function(error, user) {
					var renderedTemplate = renderHTML("answer.jade", {
						answer : {
							text : makeURLClickable(answer),
							time : time_stamp(new Date()),
							user : sess.email
						}
					});
					io.sockets.emit("answerUpdated", renderedTemplate, id);
					questionProvider.findById(id, function(error, question) {
						userProvider.findByUsername(question.asker, function(error, user) {
							followers = question.followers;
							for (var i = 0; i < followers.length; i++) {
								follower = followers[i].follower;
								to = basket[follower];
								if (sess.email != follower)
									io.sockets.socket(to).emit("newReplyToFollow", renderHTML('ticker_item.jade', {
										item : question._id,
										qText : question.question.substring(0, 15) + "..."
									}), question._id);
							}
						})
					})
				})
			});
		})
	});

	socket.on('deleteQuestion', function(id) {
		questionProvider.getCollection(function(error, question_collection) {
			question_collection.remove({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, function() {
				io.sockets.emit('deleted', id);
			})
		});
	});

	socket.on('followQuestion', function(id) {
		questionProvider.getCollection(function(error, question_collection) {
			question_collection.update({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, {
				$push : {
					followers : {
						follower : sess.email
					}
				}
			}, function() {
				socket.emit('followed', id);
			})
		});
	})

	socket.on('unfollowQuestion', function(id) {
		questionProvider.getCollection(function(error, question_collection) {
			question_collection.update({
				_id : question_collection.db.bson_serializer.ObjectID.createFromHexString(id)
			}, {
				$pull : {
					followers : {
						follower : sess.email
					}
				}
			}, function() {
				socket.emit('unfollowed', id);
			})
		});
	})

	socket.on('getReplies', function(id) {
		questionProvider.findAllAnswers(id, function(error, answers) {
			allAnswers = answers[0].answers;
			if (allAnswers.length > 0) {
				answers = "";
				var qId = id;
				recurseAnswers(allAnswers, answers, qId);
			}
		});
	});

	socket.on('disconnect', function() {
		userProvider.loggedOut(sess.email);
		//basket[sess.email] = null;
		//sess.email = null;
		//sess.touch().save();
		io.sockets.emit('user disconnected');
	});
});
