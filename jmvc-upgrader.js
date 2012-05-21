/**
 * Shaper for updating usage of JMVC's steal from 3.1 syntax to 3.2.
 */
if (typeof define !== 'function') { var define = require('./jsshaper/src/node_modules/amdefine')(module); }

define(['./jsshaper/src/shaper', './jsshaper/src/tkn','./jsshaper/src/ref','./jsshaper/src/fmt'], function(Shaper, tkn, Ref, Fmt) {
"use strict"; "use restrict";
/*global console: true print: true*/

var VIEW = 'mustache'; // TODO configure
var VIEW_STEAL = 'mustache';

var PREFIXES = {
	coffee: '.',
	controllers: './controllers',
	css: '.',
	less: '.',
	models: './models',
	resources: './resources',
	views: './views'
};
var SUFFIXES = {
	coffee: '.coffee',
	controllers: '_controller.js',
	css: '.css',
	less: '.less',
	models: '.js',
	resources: '.js',
	views: '.'+VIEW
};
var WHITELIST = {
	coffee: true,
	controllers: true,
	css: true,
	less: true,
	models: true,
	plugins: true,
	resources: true,
	views: true
};
var LOG = false;

var log = (typeof console !== "undefined") && console.log || print;
if(!LOG) {
	log = function() {};
}
var stealDotTmpl = "steal.$($$)";
var stealTmpl = "steal($$)";
var hasExt = /\.[^.\/]+$/;

/*jshint newcap: false */
Shaper("jmvc-upgrader", function(root) {

	var context = {};
	return Shaper.traverse(root, {pre: function(node, ref) {
		var startArgs, converted, method;
		if (node.type === tkn.CALL && findSteal(node)) {
			var callOn = node.children[0];
			if(callOn.type === tkn.DOT) {
				if(LOG) {
					startArgs = printArgs(node.children[1],false);
					method = node.children[0].children[1].value;
				}
				converted = convertDot(node,ref,context);
				if(LOG) {
					log(Fmt('.{1}({0})\n => {2}',
						startArgs,
						method,
						converted || "TODO"));
				}
			} else if(callOn.type === tkn.CALL) {
				log(Fmt('({0})\n => {1}',
					printArgs(node.children[1],false),
					convertCall(node)));
			} else {
				log('TODO callOn:',callOn.type);
			}
			return;
		}
	}});
});


function convertCall(/*a steal() call*/node) {
	return "("+printArgs(node.children[1])+")";
}

function convertDot(/*a steal. call*/node,ref,ctx) {
	var dot = node.children[0],
		target = dot.children[0], // the call receiver
		method = dot.children[1].value,  // method name
		prefix = PREFIXES[method],
		suffix = SUFFIXES[method],
		argList = node.children[1],
		result;

	if(!(method in WHITELIST)) {
		return '<unchanged>';
	}
	// XXX if it is a view, we have to steal the view type first then the view
	if(method === 'views') {
		dot.children[0] = Shaper.replace(Fmt('$("{0}")',VIEW_STEAL), target);
		dot.children[1] = Shaper.parse('then');
		// XXX fix the args
		return Fmt("(VIEW).then({0})",printArgs(argList,prefix,suffix));
	}
	node.children[0] = target;
	// if it's the first call on steal, don't add a newline
	if(target.type !== tkn.IDENTIFIER || target.value !== 'steal') {
		node.srcs.splice(1, 0, '\n\t');
	}
	return "("+printArgs(argList,prefix,suffix)+")";
}

function findSteal(node) {
	if (Shaper.match(stealDotTmpl,node) || Shaper.match(stealTmpl,node)) {
		return node;
	} else if(node.type === tkn.DOT || node.type === tkn.CALL) {
		return findSteal(node.children[0]);
	}
}

function fixPath(arg,prefix,suffix) {
	var value = arg.value;
	if(value.indexOf('//') === 0) {
		value = value.substring(2);
	} else if(prefix) {
		value = Fmt('{0}/{1}',prefix,value);
	}
	if(suffix && !hasExt.test(value)) {
		value = Fmt('{0}{1}',value,suffix);
	}
	return value;
}

function printArgs(listNode,prefix,suffix) {
	return listNode.children.map(function(arg,i) {
		if(arg.type === tkn.STRING) {
			var newValue = Fmt('"{0}"',fixPath(arg,prefix,suffix));
			listNode.children[i] = Shaper.parse(newValue);
			return prefix === false ? arg.value : newValue;
		} else if(arg.type === tkn.FUNCTION) {
			return '<function>';
		} else if(arg.type === tkn.IDENTIFIER) {
			return arg.value;
		} else {
			return Fmt('{1}<???:{0}>',arg.type,arg.value);
		}
	}).join(',');
}

return Shaper.get("jmvc-upgrader");
});
