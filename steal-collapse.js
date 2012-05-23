/**
 * Shaper for cleaning up steal 3.2 declarations. Multiple calls are collapsed into a single
 * wrapped call and non-dependant arguments are sorted.
 */
if (typeof define !== 'function') { var define = require('./jsshaper/src/node_modules/amdefine')(module); }

define(['./jsshaper/src/shaper', './jsshaper/src/tkn','./jsshaper/src/ref','./jsshaper/src/fmt'], function(Shaper, tkn, Ref, Fmt) {
"use strict"; "use restrict";
/*global console: true print: true*/

var LOG = false;
var MAX_LINE = 80;
var TAB_SIZE = 4;

var log = (typeof console !== "undefined") && console.log || print;
if(!LOG) {
	log = function() {};
}
var stealTmpl = "steal($$)";
var stealClean = "steal.clean($$)";
var stealBuild = "steal.build($$)";
var stealDotTmpl = "steal.$($$)";

/*jshint newcap: false */
Shaper("steal-collapse", function(root) {

	return Shaper.traverse(root, {pre: function(node,ref) {
		var repl = collapseSteals(node);
		if(repl) {
			ref.set(repl);
			return "break";
		}
	}});
});

function isAllStealCalls(node) {
	var nonSteal = true;
	Shaper.traverse(node.body,{pre:function(node,ref) {
		if(nonSteal) {
			nonSteal = false;
		}
		if(!findSteal(node)) {
			nonSteal = true;
			return "break";
		}
	}});
	return !nonSteal;
}

function collapseSteals(node, indent) {
	indent = indent || '\t';
	// find the node for the last call to steal in the chain because it will contain all the calls
	// collect all the arguments, then replace the whole thing with one call to steal()
	var currentSteal;
	if (node.type === tkn.CALL && (currentSteal = findSteal(node))) {
		var args = [], skip;
		Shaper.traverse(node,{post:function(node) {
			if (node.type !== tkn.CALL || findSteal(node) !== currentSteal) {
				return;
			}
			var callOn = node.children[0];
			if(callOn.type === tkn.DOT && callOn.children[1].value === 'then') {
				log(Fmt('.then(fn) => fn'));
				args = args.concat(node.children[1].children.map(thenArg));
			} else if(callOn.type === tkn.CALL) {
				log(Fmt('collected: {0}', printArgs(node.children[1])));
				args = args.concat(node.children[1].children);
			} else if(callOn.type === tkn.IDENTIFIER && callOn.value === 'steal') {
				log(Fmt('steal( {0} )', printArgs(node.children[1])));
				args = args.concat(node.children[1].children);
			} else if(callOn.type === tkn.DOT) {
				skip = true;
				return;
			} else {
				log('TODO callOn:',callOn.type);
			}
		}});

		if(skip) return node;

		// XXX order should not matter, so sort any run of strings between non-strings
		var sortStart = 0, sortEnd = 0;
		args.forEach(function(arg,i) {
			if(arg.type === tkn.STRING) {
				sortEnd++;
			} else {
				subSort(args,sortStart,sortEnd);
				sortStart = sortEnd = i + 1;
			}
		});
		subSort(args,sortStart,sortEnd);

		// remove duplicates, just so it looks nice
		deDupe(args);

		log(Fmt('=> steal({0});\n',printArgs({children:args})));

		// replace with a single call to steal
		var repl = Shaper.parse('steal()');
		var list = repl.children[1];
		list.srcs[0] = '(';

		// wrap lines
		var lineLen = indent.length * TAB_SIZE + 1;
		args.forEach(function(arg) {
			if(arg.type === tkn.OBJECT_INIT) {
				lineLen = MAX_LINE;
				list.srcs[list.srcs.length  - 1] += '\n' + indent;
			} else if(arg.type === tkn.FUNCTION && isAllStealCalls(arg)) {
				log('splicing in a .then()');
				// if a function contains only calls to steal, we can replace it with
				// .then(args...)
				// first wrap up the old list
				list.srcs[list.srcs.length - 1] = ')';

				// .then becomes the parent of what we have so far,
				// the current function's args are pushed into then(),
				// and we start a new steal after
				repl = Shaper.replace(Fmt('$.then($)\n{0}()',indent),
					repl,flattenSteals(arg.body,indent));
				list = repl.children[1]; // this is the empty () at the end
				log('spliced in a .then()'+repl);
				list.srcs[0] = '(';

				return; // continue;
			} else {
				var argLen = arg.value.length + 1;
				if(arg.type === tkn.STRING) {
					argLen += 2; // quotes
				}
				lineLen += argLen;
				if(lineLen >= MAX_LINE) {
					list.srcs[list.srcs.length  - 1] += '\n' + indent;
					lineLen = argLen + indent.length * TAB_SIZE;
				}
			}
			list.children.push(arg);
			list.srcs.push(',');
		});


		list.srcs[list.srcs.length - 1] = ')';
		return list.children.length ? repl : repl.children[0];
	}
}

function findSteal(node) {
	if (Shaper.match(stealDotTmpl,node) || Shaper.match(stealTmpl,node)) {
		if(Shaper.match(stealClean) || Shaper.match(stealBuild)) {
			return false;
		}
		return node;
	} else if(node.type === tkn.DOT || node.type === tkn.CALL || node.type === tkn.SEMICOLON) {
		return findSteal(node.children[0]);
	}
}

/** @return a LIST node */
function flattenSteals(node,indent) {
	var list;
	Shaper.traverse(node, {pre: function(node,ref) {
		var repl = collapseSteals(node,indent + '\t');
		if(repl) {
			list = repl.children[1];
			// XXX remove the () so it can be added to a method easil
			list.srcs[0] = '';
			list.srcs[list.srcs.length - 1] = '';
			return "break";
		}
	}});
	return list;
}

function printArgs(listNode) {
	return listNode.children.map(function(arg,i) {
		if(arg.type === tkn.STRING) {
			return Fmt('"{0}"',arg.value);
		} else if(arg.type === tkn.FUNCTION) {
			return '<function>';
		} else if(arg.type === tkn.IDENTIFIER) {
			return arg.value;
		} else {
			return Fmt('{1}<???:{0}>',arg.type,arg.value);
		}
	}).join(',');
}

function subSort(array,start,end) {
	var sorted = array.slice(start,end).sort(function(a,b) {
		a = a.value.toLowerCase();
		b = b.value.toLowerCase();
		return a === b ? 0 : a < b ? -1 : 1;
	});
	array.splice.apply(array,[start,end-start].concat(sorted));
}

function thenArg(arg) {
	// HACK wrap then(string)s so ordering is maintained
	if(arg.type === tkn.STRING || arg.type === tkn.IDENTIFIER) {
		return Shaper.replace('({ src: $, waits: true })',arg).children[0];
	}
	return arg;
}

function deDupe(args) {
	var seen = {};
	for(var i = 0; i < args.length; i++) {
		if(args[i].type === tkn.STRING) {
			if(args[i].value in seen) {
				args.splice(i,1);
				i--;
			} else {
				seen[args[i].value] = true;
			}
		}
	}
}

return Shaper.get("steal-collapse");
});
