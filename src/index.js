import fm from 'front-matter';
import fs from 'fs';
import marked from 'marked-ast';
import loaderUtils from 'loader-utils';
import uuid from 'node-uuid';
import path from 'path';
import slug from 'slug';
import dasherize from 'dasherize';

const clone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
}


const newFileContents = function(data, wp, attributes) {
  return `---
title: ${data}
slug: ${slugify(data)}
subtitle:
created: ${new Date().toISOString()}
author: ${attributes.author}
twitter: ${attributes.twitter}
type: ${attributes.type}
---
`
}

const slugify = function(data) {
  return slug(dasherize(data)).toLowerCase()
}

const newFilePath = function(data, wp, attributes) {
  const md = `${slugify(data)}.md`;
  const p = path.join(path.dirname(wp.resource), md);
  return p;
}

const fileExist = function(p) {
  try {
    fs.statSync(p)
    return true
  } catch(err) {
    return !(err && err.code === 'ENOENT');
  }
}

const createFileIfNeeded = function(data, wp, attributes) {
  const nfp = newFilePath(data, wp, attributes);
  if (!fileExist(nfp)) {
    fs.writeFileSync(nfp, newFileContents(data, wp, attributes));
  }
}

const wikiLeaf = function(ast, wp, attributes) {
  const a = clone(ast);
  if (a.body !== undefined) {
    a.body = wikiBase(a.body, wp, attributes);
  }
  if (a.text !== undefined) {
    a.text = wikiBase(a.text, wp, attributes);
  }
  return a;
}

const wikiText = function(text, wp, attributes) {
  const reg = RegExp(/(.*?)\[\[\[(.*?)\]\]\](.*?)$/);
  let result = reg.exec(text);
  if (result !== null) {
    createFileIfNeeded(result[2], wp, attributes)
    return [
             result[1],
             {
               type: 'wikismith',
               slug: slugify(result[2]),
               method: 'embed'
             },
             wikiText(result[3])
           ];
  } else {
    const reg = RegExp(/(.*?)\[\[(.*?)\]\](.*?)$/);
    let result = reg.exec(text);
    if (result !== null) {
      createFileIfNeeded(result[2], wp, attributes)
      return [
               result[1],
               {
                 type: 'wikismith',
                 slug: slugify(result[2]),
                 method: 'reference'
               },
               wikiText(result[3])
             ];
    } else {
      return text;
    }
  }

}

const combineAdjecentStrings = function(a) {
  const results = [];
  let lastV=null;
  for (const v of a) {
    if(typeof(v)===typeof("string")) {
      if( typeof(lastV) === typeof("string")) {
        lastV = [lastV, v].join('')
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
  if (lastV !== null) {
    results.push(lastV);
  }
  return results;
}

const wikiBase = function(ast, wp, attributes) {
  let results;
  if (typeof(ast) === typeof('string')) {
    return wikiText(ast, wp, attributes);
  } else if (ast instanceof Array) {
    return combineAdjecentStrings(ast).map( (x) => wikiBase(x, wp, attributes));
  } else {
    return wikiLeaf(ast, wp, attributes);
  }
}

const sectionizeByHeadings = function(ast) {
  const sections = [];
  let wpSection = [];
  for(const element of ast) {
    if(element.type === 'heading') {
      if(wpSection.length > 0) {
        sections.push({type: 'section',
                       key: uuid.v4(),
                       body: clone(wpSection)
                      });
        wpSection = [];
      }
    }
    wpSection.push(element);
  }
  sections.push({type: 'section',
                 key: uuid.v4(),
                 body: clone(wpSection),
               });
  return sections;
}

module.exports = function (source) {
  const wp = this;
  wp.cacheable && wp.cacheable();
  // var options = loaderUtils.parseQuery(wp.query);
  const { attributes, body } = fm(source);
  attributes.ast = wikiBase(sectionizeByHeadings(marked.parse(body)), wp, attributes);
  return 'module.exports = ' + JSON.stringify(attributes, null, 2);
};
