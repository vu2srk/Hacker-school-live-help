$(function() {
	$.extend($.fn.disableTextSelect = function() {
		return this.each(function() {
			if ($.browser.mozilla) {//Firefox
				$(this).css('MozUserSelect', 'none');
			} else if ($.browser.msie) {//IE
				$(this).bind('selectstart', function() {
					return false;
				});
			} else {//Opera, etc.
				$(this).mousedown(function() {
					return false;
				});
			}
		});
	});
});

var topics = [{
	name : 'rails'
}, {
	name : 'life'
}, {
	name : 'python'
}, {
	name : 'scala'
}, {
	name : 'html'
}, {
	name : 'javascript'
}, {
	name : 'scheme'
}, {
	name : 'lisp'
}, {
	name : 'closure'
}, {
	name : 'closurescript'
}, {
	name : 'java'
}]

var topic_array = ['1'];
//_.pluck(topics, 'name');

var updateFilter = function() {
	var vals = $("#topic_filter").val().split(',');
	//alert(vals[0]);
	if (vals[0]) {
		var contains_selector = '';
		for (var i = 0; i < vals.length - 1; i++) {
			contains_selector += '.topic:contains(' + vals[i] + '), ';
		};
		if (vals.length > 0) {
			contains_selector += '.topic:contains(' + vals[vals.length - 1] + ')';
		} else {
			contains_selector = '.topic';
		}

		var $questions = $(".question");
		$questions.hide();
		$questions.each(function(question) {
			if ($(this).find(contains_selector).length > 0) {
				$(this).show();
			}
		});
	} else {
		$(".question").show();
	}

};

$.expr[':'].Contains = function(a, i, m) {
	return jQuery(a).text().toLowerCase().indexOf(m[3].toLowerCase()) >= 0;
};

var searchFilter = function() {
	var query = $("#topic_filter").val().trim();
	var $questions = $(".question");
	var contains_selector = '';

	if (query) {
		contains_selector = '.topic:Contains(' + query + '), .question_title:Contains(' + query + ')';
		filterQuestions(contains_selector);
	} else {
		$questions.show();
	}
};

var filterQuestions = function(filter) {
	var $questions = $(".question");
	$questions.hide();

	$questions.each(function(question) {
		if ($(this).find(filter).length > 0) {
			$(this).show();
		}
	});
};

$(document).ready(function() {
	$('input, a, button').live('click', function(event) {
		event.stopPropagation();
	});
	$('.answer_link, .question').live('click', function(event) {
		$details = $(this).closest('.question').find('.details');
		if ($details.is(':visible')) {
			$(this).closest('.question').find('.expand').html('Expand');
		} else {
			$(this).closest('.question').find('.expand').html('Collapse');
		}
		$details.slideToggle('fast').find('.answer_text').focus().val('');

		return false;
	});
	$('a.ticker_item').live('click', function() {
		var $question = $('#' + $(this).attr('href'));
		$question.find(".details").slideDown("fast").find('.answer_text').focus().val('');
		$(this).remove();
		return false;
	});
	$("a:contains(0 answers)").css('color', '#b94a48');
	$('#topic_input').tagsInput({
		"onAddTag" : disableSubmitBtn,
		"onRemoveTag" : disableSubmitBtn
	});
	$('#topic_filter').on('keyup', searchFilter);
	
	$("#question_input").on("keypress", function() {
		if ($(this).val().trim()==""){
			$('#topic_input_tagsinput').hide();
		} else
			$('#topic_input_tagsinput').show();
	});
	
	function disableSubmitBtn() {
		if ($(".add_question").find(".tag").length>0){
			$('#question_submit').removeAttr("disabled");
		} else
			$('#question_submit').attr("disabled","disabled");
	}
	
	$('#topic_input_tagsinput').hide();

	$("#question_input").on("click", function() {
		$.ajax({
			url : 'typeahead',
			type : "GET",
			success : function(data) {
				var source;
				source = new Array;
				$.each(data, function(index, item) {
					source.push(item);

				});
				$('#topic_input_tag').typeahead({
					source : source
				});
			}
		});
	});

	$('.filter').live('click', function(e) {
		var $questions = $('.question');
		var type = $(this).attr('data');

		if (type === 'all') {
			$questions.show();
		} else if (type === 'my') {
			filterQuestions('.delete_link');
		} else {
			filterQuestions("a:contains('Unfollow')");
		}
	});
});
