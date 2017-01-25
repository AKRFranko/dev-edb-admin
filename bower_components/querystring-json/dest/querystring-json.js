(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.QSJS = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var matchDateIso = /(\d{4})-(\d{2})-(\d{2})(?:(T)(\d{2}):(\d{2}):(\d{2}(?:\.\d{1,3})?))?(?:(Z)|(?:([+-])(\d{2}):(\d{2})))?/i;
var matchInteger = /^\d+$/i;
var matchFloat = /^\d+(?:\.\d+)$/i;


function isIsoDate(str) {
    return matchDateIso.test(str);
}

//===============================================================================
// Parse ISO 8601 Date Format date string and return a date - equivalent to https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/parse
// Found here: n8v.enteuxis.org/2010/12/parsing-iso-8601-dates-in-javascript/
// some fixes added
//===============================================================================
function parseIsoDate(dateStr) {

    // parenthese matches:
    // year month day    hours minutes seconds  
    // dotmilliseconds 
    // tzstring plusminus hours minutes
    var d = dateStr.match(matchDateIso);

    //                                     0                                1       2     3     4    5     6     7         8          9    10    11  
    // "2010-12-07T01:02:03.123-01:12" => ["2010-12-07T01:02:03.123-01:12", "2010", "12", "07", "T", "01", "02", "03.123", undefined, "-", "01", "12"]
    // "2010-12-07T01:02:03-01:12"     => ["2010-12-07T01:02:03-01:12", "2010", "12", "07", "T", "01", "02", "03", undefined, "-", "01", "12"]
    // "2010-12-07T01:02:03Z"          => ["2010-12-07T01:02:03Z", "2010", "12", "07", "T", "01", "02", "03", "Z", undefined, undefined, undefined]
    // "2010-12-07T01:02:03"           => ["2010-12-07T01:02:03", "2010", "12", "07", "T", "01", "02", "03", undefined, undefined, undefined, undefined]
    // "2010-12-07"                    => ["2010-12-07", "2010", "12", "07", undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]

    if (!d) {
        throw "Couldn't parse ISO 8601 date string '" + dateStr + "'";
    }

    // parse strings, leading zeros into proper types
    var i;
    for (i = 1; i < 11; i++) {
        if (matchInteger.test(d[i])) {
            d[i] = parseInt(d[i], 10);
        }
        if (matchFloat.test(d[i])) {
            d[i] = parseFloat(d[i]);
        }
    }

    // fix undefined numeric values
    var fixUndef = [1, 2, 3, 5, 6, 7, 10, 11];
    for (i in fixUndef) {
        if (fixUndef.hasOwnProperty(i)) {
            if (!d[fixUndef[i]]) {
                d[fixUndef[i]] = 0;
            }
        }
    }

    var hasTimezone = d[8] === "Z" || d[9] === "-" || d[9] === "+";

    var res;
    if (hasTimezone) {
        // assume date is UTC
        res = new Date(Date.UTC(d[1], d[2] - 1, d[3], d[5], d[6], d[7]));
    } else {
        // assume date is localtime
        res = new Date(d[1], d[2] - 1, d[3], d[5], d[6], d[7]);
    }

    // if there's a timezone, calculate it
    if (hasTimezone && d[10]) {
        var offset = d[10] * 60 * 60 * 1000;
        if (d[11]) {
            offset += d[11] * 60 * 1000;
        }
        if (d[9] === "-") {
            offset *= -1;
        }

        res = new Date(res.getTime() - offset);
    }

    return res;
};

function formatIsoDate(date) {
    return date.toISOString();
}

module.exports = {
    testStr: isIsoDate,
    testObject: function (date) {
        return date instanceof Date;
    },
    parse: parseIsoDate,
    format: formatIsoDate
}
},{}],2:[function(require,module,exports){
module.exports.extend = function (target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (var prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

module.exports.startsWith = function (str) {
    return this.slice(0, str.length) === str;
};

module.exports.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === "[object Array]";
};
},{}],3:[function(require,module,exports){
var utils = require("./_utils.js");

var matchDateNet = /\/Date\((\d+)(?:([-+])(\d{2})(\d{2}))?\)\//i;

var defaultOptions = {
    useInputTimeZone: false,
    defaultInputTimeZoneOffset: 0,
    shiftToLocalTimeZone: false,
}

/**
 * @param {Object} opts transformation iptions: 
 *  {bool}useInputTimeZone - enable parsing input timezone, 
 *  {int} defaultInputTimeZoneOffset - used as offset when inputTimezone not parsed, 
 *  {bool} shiftToLocalTimeZone - shift parsed date to client's local timezone
 */
function constructor(opts) {
    var localOffset = new Date().getTimezoneOffset() * 60 * 1000;
    var opts = utils.extend({}, defaultOptions, opts);

    function isDotNetDate(str) {
        return matchDateNet.test(str);
    };

    function parseDotNetDate(str) {
        var match = matchDateNet.exec(str);
        if (!match) {
            throw "Input string has wrong format.";
        }

        var time = parseInt(match[1], 10)

        var hasTimeZone = match[2] != null;

        var offset = 0;
        // parse input timezone if present
        if (opts.useInputTimeZone && hasTimeZone) {
            var hh = Number.parseInt(match[3]);
            var mm = Number.parseInt(match[4]);
            if (Number.isNaN(hh) || Number.isNaN(mm)) {
                throw "Wrong timezone format";
            }

            offset = (hh * 60 + mm) * 60 * 1000;

            offset *= match[2] == "-" ? -1 : 1;
        } else {
            // use default timezoneOffset for input time
            offset = opts.defaultInputTimeZoneOffset * 60 * 1000;
        }

        // shift parset UTC time to local time
        if (opts.shiftToLocalTimeZone) {
            offset += localOffset;
        }

        return new Date(time - offset);
    }

    function formatDotNetDate(date, useTimeZone) {
        var tz = "";
        if (useTimeZone) {
            var offset = date.getTimezoneOffset();
            var negate = offset < 0;
            offset = negate ? -offset : offset;
            var hours = (offset / 60).toFixed(0);
            var minutes = (offset % 60).toFixed(0);
            if (hours.length < 2) {
                hours = "0" + hours;
            }
            if (minutes.length < 2) {
                minutes = "0" + minutes;
            }
            tz = (negate ? "-" : "+") + hours + minutes;
        }


        return "\/Date(" + date.getTime().toString() + tz + ")\/";
    }

    return {
        testStr: isDotNetDate,
        testObject: function (date) {
            return date instanceof Date;
        },
        parse: parseDotNetDate,
        format: formatDotNetDate,
        options: opts
    }
};
module.exports = constructor;
module.exports.defaultOptions = defaultOptions;






},{"./_utils.js":2}],4:[function(require,module,exports){
module.exports = extend;

/*
  var obj = {a: 3, b: 5};
  extend(obj, {a: 4, c: 8}); // {a: 4, b: 5, c: 8}
  obj; // {a: 4, b: 5, c: 8}

  var obj = {a: 3, b: 5};
  extend({}, obj, {a: 4, c: 8}); // {a: 4, b: 5, c: 8}
  obj; // {a: 3, b: 5}

  var arr = [1, 2, 3];
  var obj = {a: 3, b: 5};
  extend(obj, {c: arr}); // {a: 3, b: 5, c: [1, 2, 3]}
  arr.push[4];
  obj; // {a: 3, b: 5, c: [1, 2, 3, 4]}

  var arr = [1, 2, 3];
  var obj = {a: 3, b: 5};
  extend(true, obj, {c: arr}); // {a: 3, b: 5, c: [1, 2, 3]}
  arr.push[4];
  obj; // {a: 3, b: 5, c: [1, 2, 3]}
*/

function extend(obj1, obj2 /*, [objn]*/) {
  var args = [].slice.call(arguments);
  var deep = false;
  if (typeof args[0] === 'boolean') {
    deep = args.shift();
  }
  var result = args[0];
  var extenders = args.slice(1);
  var len = extenders.length;
  for (var i = 0; i < len; i++) {
    var extender = extenders[i];
    for (var key in extender) {
      // include prototype properties
      var value = extender[key];
      if (deep && value && (typeof value == 'object')) {
        var base = Array.isArray(value) ? [] : {};
        result[key] = extend(true, base, value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

},{}],5:[function(require,module,exports){
var utils = require("./_utils.js");

/**
 * Apply value to object
 * 
 * @param {object} object target object
 * @param {string} path path to property
 * @param {function} value value factory fo property
 */
function applyPath(object, path, value) {
    if (!object) throw "target is null";

    var root = object;
    for (var i = 0; i < path.length; i++) {
        var prop = path[i];
        var assumeRootIsArray = Number.isInteger(prop);
        var assumePropertyIsArray = Number.isInteger(path[i + 1]);
        var current = root[prop];

        if (assumeRootIsArray && !utils.isArray(root)) {
            throw "wrong path to array";
        }

        if (!assumeRootIsArray && utils.isArray(root)) {
            throw "wrong path to object";
        }

        if (current && assumePropertyIsArray && !utils.isArray(current)) {
            throw "wrong path to array";
        }

        if (current && !assumePropertyIsArray && utils.isArray(current)) {
            throw "wrong path to object";
        }

        if (!current) {
            // create if does not exists
            current = assumePropertyIsArray ? [] : {};
        }

        // apply value prop;
        if (i == path.length - 1) {
            current = value;
        }

        root[prop] = current;
        root = current;
    }
}
module.exports = applyPath;
},{"./_utils.js":8}],6:[function(require,module,exports){
var utils = require("./_utils.js");

function _nodeType(value) {
    var type = typeof (value);
    if (type == "function") {
        return type;
    } else {
        type = type == "object"
            ? (utils.isArray(value) ? "array" : "object")
            : "simple"; // assumed that all other types are simple
    }

    return type;
}

/**
 * Iterate object|array
    @param {Object} root node to iterate
    @param {String} id The id of node
    @param {Function} visitor Visitor function. Return false to stop iteration
    @param {Object} opts Iteration options
 */
function _iterateObject(root, visitor, opts) {
    switch (root.type) {
        case "object":
            var stop = visitor(root, true);
            if (!stop) {
                for (var prop in root.value) {
                    if (root.value.hasOwnProperty(prop)) {
                        if (opts.ignorePrivate && utils.startsWith.call(prop, opts.privatePreffix)) {
                            continue;
                        }

                        var value = root.value[prop];

                        var node = {
                            id: prop,
                            value: value,
                            parent: root,
                            type: _nodeType(value)
                        }
                        _iterateObject(node, visitor, opts);
                    }

                }
            }

            visitor(root, false);
            break;

        case "array":
            var stop = visitor(root, true);
            if (!stop) {
                for (var i = 0; i < root.value.length; i++) {

                    var value = root.value[i];
                    var node = {
                        id: i,
                        value: value,
                        parent: root,
                        type: _nodeType(value)
                    }
                    _iterateObject(node, visitor, opts);
                }
            }
            visitor(root, false);
            break;

        // simple types and functions not iterated
        case "simple":
            visitor(root, true);
            visitor(root, false);
            break;
        case "function":
            break;

        default:
            throw "unknown node type: " + root.type;
    }
}

function iterateObject(obj, visitor, opts) {
    opts = opts || {
        ignorePrivate: true,
        privatePreffix: "_"
    };

    var root = {
        type: _nodeType(obj),
        id: null,
        value: obj
    }

    if (root.type == "object" || root.type == "array") {
        return _iterateObject(root, visitor, opts)
    }
}

module.exports = iterateObject;
},{"./_utils.js":8}],7:[function(require,module,exports){
var utils = require("./_utils.js");

/**
 * Implements path splitting logic
 * @param {string} path The path
 * @returns {string[]} Array of path elements
 */
function splitPath(path, splitExp) {
    var splitExp = splitExp || /[\[\]\.\(\)]/g
    return path
        .split(splitExp)
        .filter(function (e) {
            return e.length > 0;
        })
        .map(function (prop) {
            var index = parseInt(prop);
            if (Number.isNaN(index)) {
                return prop;
            }
            return index;
        });
}
module.exports.splitPath = splitPath;

/**
 * Implements query splitting logic
 * @param {string} query The query
 * @returns {string[][]} Array of [path][value] pairs
 */
function splitQuery(query, queryDelimiterChar, setValueChar) {
    var queryDelimiterChar = queryDelimiterChar || "&";
    var setValueChar = setValueChar || "=";

    var tokens = query.split(queryDelimiterChar)
        .filter(function(e){
            return e.length>0;
        })
        .map(function (token) {
            return token.split(setValueChar);
        });

    return tokens;
}
module.exports.splitQuery = splitQuery;
},{"./_utils.js":8}],8:[function(require,module,exports){
module.exports.startsWith = function (str) {
    return this.slice(0, str.length) === str;
};

module.exports.isArray = function(arg) {
    return Object.prototype.toString.call(arg) === "[object Array]";
};
},{}],9:[function(require,module,exports){
var utils = require("./_utils.js");
var iterateObject = require("./_iterateObject.js");
var parser = require("./_parser.js");
var apply = require("./_apply.js");
var jsonDotNetDate = require("json-dotnet-date")();
var iso8601Date = require("iso8601-date");
var merge = require("just-extend")

var defaultOptions = {
    arrayOpenChar: "(",
    arrayCloseChar: ")",
    propAccessChar: ".",
    setValueChar: "=",
    queryDelimiterChar: "&",
    useDotNetDateFormat: false,
    lowercaseNames: false,
    formatters: [
        {
            accept: iso8601Date.testObject,
            format: iso8601Date.format
        }
    ],
    parsers: [
        {
            accept: function (str) {
                var matchInteger = /^\d+$/i;
                var matchFloat = /^\d+(?:\.\d+)$/i;
                return matchInteger.test(str) || matchFloat.test(str);
            },
            parse: function (str) {
                var matchInteger = /^\d+$/i;
                var matchFloat = /^\d+(?:\.\d+)$/i;

                if (matchFloat.exec(str)) {
                    return parseFloat(str);
                }
                if (matchInteger.exec(str)) {
                    return parseInt(str);
                }


                throw "Unexpected value: " + str;
            }
        },
        {
            accept: iso8601Date.testStr,
            parse: iso8601Date.parse
        },
        {
            accept: jsonDotNetDate.testStr,
            parse: jsonDotNetDate.parse
        }
    ]
};

function constructor(opts) {
    var opts = merge(true, {}, defaultOptions, opts || {});

    if (opts.useDotNetDateFormat) {
        opts.formatters[0] = {
            accept: jsonDotNetDate.testObject,
            format: jsonDotNetDate.format,
        };
    }

    function decode(query, to) {
        var tokens = parser.splitQuery(query, opts.queryDelimiterChar, opts.setValueChar);
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            var path = parser.splitPath(token[0]);
            var value = token[1];

            if (opts.lowercaseNames) {
                for(var pIndex=0;pIndex<path.length;pIndex++){
                    path[pIndex] = Number.isInteger(path[pIndex])?path[pIndex]:path[pIndex].toLowerCase();
                }
            }

            //assume target type by first path
            if (!to) {
                to = Number.isInteger(path[0]) ? [] : {};
            }

            value = value.replace("+", "%20");
            value = decodeURIComponent(value);

            for (var parserIndex = 0; parserIndex < opts.parsers.length; parserIndex++) {
                var p = opts.parsers[parserIndex];
                if (p.accept(value)) {
                    value = p.parse(value);
                    break;
                }
            }

            apply(to, path, value)
        }

        return to;
    };


    function _toNameValuePairs(obj) {
        var pairs = [];
        iterateObject(obj, function (node, start) {
            if (!start) {
                return;
            }

            var isLeaf = false;
            var value = node.value;
            // detect leaf
            isLeaf = node.type == "simple";
            if (!isLeaf) {
                for (var fmtIndex = 0; fmtIndex < opts.formatters.length; fmtIndex++) {
                    var f = opts.formatters[fmtIndex];
                    if (f.accept(value)) {
                        value = f.format(value);
                        isLeaf = true;
                        break;
                    }
                }
            }

            if (!isLeaf) {
                return;
            }

            value = encodeURIComponent(value);
            value = value.replace(/%20/g, "+");

            var nodesPath = [];
            var current = node;
            while (current != null) {
                if (current == null) {
                    break;
                }
                nodesPath.push(current);
                current = current.parent
            }

            var name = "";
            for (var i = nodesPath.length - 1; i >= 0; i--) {
                var node = nodesPath[i];
                if (!node.parent) {
                    continue;
                }

                var parent = node.parent;

                switch (parent.type) {
                    case "array":
                        name += opts.arrayOpenChar + node.id + opts.arrayCloseChar;
                        break;
                    case "object":
                        name += name.length > 0 ? opts.propAccessChar : "";
                        name += node.id;
                        break;

                    default:
                        throw "Unexpected node type: " + parent.type;
                }
            }

            if (opts.lowercaseNames) {
                name = name.toLowerCase();
            }

            pairs.push(name + opts.setValueChar + value)
        })

        return pairs;
    }

    function encode(object) {
        var pairs = _toNameValuePairs(object);
        return pairs.join(opts.queryDelimiterChar);
    }

    return {
        decode: decode,
        encode: encode,
    };
};

constructor.defaultOptions = defaultOptions;
module.exports = constructor;
},{"./_apply.js":5,"./_iterateObject.js":6,"./_parser.js":7,"./_utils.js":8,"iso8601-date":1,"json-dotnet-date":3,"just-extend":4}]},{},[9])(9)
});