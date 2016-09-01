A markdown loader with filesystem side-effects.

Installation
------------

npm install wikismith-md-loader


Usage
-----

```js
{
  module: {
    loaders: {
      {test: /\.md$/, loader: 'wikismith-md-loader'},
    ]
  }
}
```

The result of importing a markdown file will be a JavaScript object with
properties from the front matter (as parsed by [js-yaml-front-matter]) and a
`ast` property containing the markdown AST.

For example
```
---
name: Mongo the Monkey
contact:
email: monkeysdontuseemail@hzdg.com
---

I LIKE TO EAT BANANAS
=====================

* Fat bananas
* Skinny bananas
* Whatever
```

Renders to

```
{
  "name": "Mongo the Monkey",
  "contact": null,
  "email": "monkeysdontuseemail@hzdg.com",
  "ast": [
    {
      "type": "heading",
      "text": [
        "I LIKE TO EAT BANANAS"
      ],
      "level": 1,
      "raw": "I LIKE TO EAT BANANAS"
    },
    {
      "type": "list",
      "body": [
        {
          "type": "listitem",
          "text": [
            "Fat bananas"
          ]
        },
        {
          "type": "listitem",
          "text": [
            "Skinny bananas"
          ]
        },
        {
          "type": "listitem",
          "text": [
            "Whatever"
          ]
        }
      ],
      "ordered": false
    }
  ]
}
```
