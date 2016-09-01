'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _frontMatter = require('front-matter');

var _frontMatter2 = _interopRequireDefault(_frontMatter);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _markedAst = require('marked-ast');

var _markedAst2 = _interopRequireDefault(_markedAst);

var _loaderUtils = require('loader-utils');

var _loaderUtils2 = _interopRequireDefault(_loaderUtils);

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _slug = require('slug');

var _slug2 = _interopRequireDefault(_slug);

var _dasherize = require('dasherize');

var _dasherize2 = _interopRequireDefault(_dasherize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var clone = function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
};

var newFileContents = function newFileContents(data, wp, attributes) {
  return '---\ntitle: ' + data + '\nslug: ' + slugify(data) + '\nsubtitle:\ncreated: ' + new Date().toISOString() + '\nauthor: ' + attributes.author + '\ntwitter: ' + attributes.twitter + '\ntype: ' + attributes.type + '\n---\n';
};

var slugify = function slugify(data) {
  return (0, _slug2.default)((0, _dasherize2.default)(data)).toLowerCase();
};

var newFilePath = function newFilePath(data, wp, attributes) {
  var md = slugify(data) + '.md';
  var p = _path2.default.join(_path2.default.dirname(wp.resource), md);
  return p;
};

var fileExist = function fileExist(p) {
  try {
    _fs2.default.statSync(p);
    return true;
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
};

var createFileIfNeeded = function createFileIfNeeded(data, wp, attributes) {
  var nfp = newFilePath(data, wp, attributes);
  if (!fileExist(nfp)) {
    _fs2.default.writeFileSync(nfp, newFileContents(data, wp, attributes));
  }
};

var wikiLeaf = function wikiLeaf(ast, wp, attributes) {
  var a = clone(ast);
  if (a.body !== undefined) {
    a.body = wikiBase(a.body, wp, attributes);
  }
  if (a.text !== undefined) {
    a.text = wikiBase(a.text, wp, attributes);
  }
  return a;
};

var wikiText = function wikiText(text, wp, attributes) {
  var reg = RegExp(/(.*?)\[\[\[(.*?)\]\]\](.*?)$/);
  var result = reg.exec(text);
  if (result !== null) {
    createFileIfNeeded(result[2], wp, attributes);
    return [result[1], {
      type: 'wikismith',
      slug: slugify(result[2]),
      method: 'embed'
    }, wikiText(result[3])];
  } else {
    var _reg = RegExp(/(.*?)\[\[(.*?)\]\](.*?)$/);
    var _result = _reg.exec(text);
    if (_result !== null) {
      createFileIfNeeded(_result[2], wp, attributes);
      return [_result[1], {
        type: 'wikismith',
        slug: slugify(_result[2]),
        method: 'reference'
      }, wikiText(_result[3])];
    } else {
      return text;
    }
  }
};

var combineAdjecentStrings = function combineAdjecentStrings(a) {
  var results = [];
  var lastV = null;
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = a[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var v = _step.value;

      if ((typeof v === 'undefined' ? 'undefined' : _typeof(v)) === _typeof("string")) {
        if ((typeof lastV === 'undefined' ? 'undefined' : _typeof(lastV)) === _typeof("string")) {
          lastV = [lastV, v].join('');
        } else {
          if (lastV !== null) {
            results.push(lastV);
          }
          lastV = v;
        }
      } else {
        if (lastV !== null) {
          results.push(lastV);
        }
        lastV = v;
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  if (lastV !== null) {
    results.push(lastV);
  }
  return results;
};

var wikiBase = function wikiBase(ast, wp, attributes) {
  var results = undefined;
  if ((typeof ast === 'undefined' ? 'undefined' : _typeof(ast)) === _typeof('string')) {
    return wikiText(ast, wp, attributes);
  } else if (ast instanceof Array) {
    return combineAdjecentStrings(ast).map(function (x) {
      return wikiBase(x, wp, attributes);
    });
  } else {
    return wikiLeaf(ast, wp, attributes);
  }
};

var sectionizeByHeadings = function sectionizeByHeadings(ast) {
  var sections = [];
  var wpSection = [];
  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = ast[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var element = _step2.value;

      if (element.type === 'heading') {
        if (wpSection.length > 0) {
          sections.push({ type: 'section',
            key: _nodeUuid2.default.v4(),
            body: clone(wpSection)
          });
          wpSection = [];
        }
      }
      wpSection.push(element);
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  sections.push({ type: 'section',
    key: _nodeUuid2.default.v4(),
    body: clone(wpSection)
  });
  return sections;
};

module.exports = function (source) {
  var wp = this;
  wp.cacheable && wp.cacheable();
  // var options = loaderUtils.parseQuery(wp.query);

  var _fm = (0, _frontMatter2.default)(source);

  var attributes = _fm.attributes;
  var body = _fm.body;

  attributes.ast = wikiBase(sectionizeByHeadings(_markedAst2.default.parse(body)), wp, attributes);
  return 'module.exports = ' + JSON.stringify(attributes, null, 2);
};