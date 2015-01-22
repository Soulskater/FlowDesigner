CSS Element Queries
===================

Element Queries is a polyfill adding support for element based media-queries to all new browsers (incl. IE8+).
It allows not only to define media-queries based on window-size but also adds 'media-queries' functionality depending on element (any selector supported)
size while not causing performance lags due to event based implementation.

It's a proof-of-concept event-based CSS element dimension query with valid CSS selector syntax.

Features:

 - no performance issues
 - no interval/timeout detection. Truly event-based
 - no CSS modifications. Valid CSS Syntax
 - all CSS selectors available. Uses regular attribute selector
 - supports and tested in webkit, gecko and IE(8/9/10).
 - `min-width`, `min-height`, `max-width` and `max-height` are supported so far
 - works with any layout modifications: HTML (innerHTML etc), inline styles, DOM mutation, CSS3 transitions, fluid layout changes (also percent changes), pseudo classes (:hover etc.), window resizes and more
 - no Javascript-Framework dependency (works with jQuery, Mootools, etc.)

More demos and information: http://marcj.github.io/css-element-queries/

Example
-------

```css
.widget-name {
    padding: 25px;
}
.widget-name[max-width="200px"] {
    padding: 0;
}
.widget-name[min-width="500px"] {
    padding: 55px;
}

/* responsive images /*
.responsive-image img {
    width: 100%;
}

.responsive-image[max-width^='400px'] img {
    content: url(demo/image-400px.jpg);
}

.responsive-image[max-width^='1000px'] img {
    content: url(demo/image-1000px.jpg);
}

.responsive-image[min-width='1000px'] img {
    content: url(demo/image-full.jpg);
}
```

Include the javascript files at the bottom and you're good to go. No custom javascript calls needed.

```html
<script src="src/ResizeSensor.js"></script>
<script src="src/ElementQueries.js"></script>
```

Issues
------

 - So far does not work on `img` tags. Wrapping with a `div` works fine though (See demo).
 - [only non-IE]: Adds additional hidden element into selected target element and forces target element to be relative or absolute.
 

Event-Based resize detection inspired by [backalleycoder.com](http://www.backalleycoder.com/2013/03/18/cross-browser-event-based-element-resize-detection/) <3


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/marcj/css-element-queries/trend.png)](https://bitdeli.com/free "Bitdeli Badge")


License
-------
MIT license. Copyright [Marc J. Schmidt](http://marcjschmidt.de/).