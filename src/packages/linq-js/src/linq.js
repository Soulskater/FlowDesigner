function linq() {

    var args = arguments;
    var source = [];
    _init();
    function _init() {
        if (args.length === 0) {
            return;
        }
        if (args.length > 1) {
            for (var i = 0, len = args.length; i < len; i++) {
                source.push(args[i]);
            }
        }
        else {
            if (args[0] instanceof Array) {
                source = args[0];
            }
        }
    }

    return{
        //
        //Creates a new collection, executes the given function and push the result into the new array
        get: function () {
            return source;
        },
        //
        //Creates a new collection, executes the given function and push the result into the new array
        map: function (f) {
            var result = [];
            for (var i = 0, len = source.length; i < len; i++) {
                result.push(f(source[i], i));
            }
            return linq(result);
        },

        //
        //Iterates throught on the array, and executes the parameter function on each element
        forEach: function (f) {
            for (var i = 0, len = source.length; i < len; i++) {
                f(source[i], i);
            }
        },

        //
        //Filter the array according to the param function
        where: function (f) {
            return linq(source.filter(f));
        },

        //
        //Returns with the first selected element according to the param function, otherwise throws an exception
        first: function (f) {
            if (!f) {
                if (source.length === 0) {
                    throw "No elements in the sequence!";
                }
                else {
                    return source[0];
                }
            }

            var match = source.filter(f);
            if (match.length === 0) {
                throw "Didn't match any element with the conditions!";
            }
            else {
                return match[0];
            }
        },

        //
        //Returns with the first selected element according to the param function, otherwise null
        firstOrDefault: function (f) {
            if (!f) {
                if (source.length === 0) {
                    return null;
                }
                else {
                    return source[0];
                }
            }
            return source.filter(f)[0];
        },

        //
        //Returns with the last selected element according to the param function, otherwise throws an exception
        last: function (f) {
            if (!f) {
                if (source.length === 0) {
                    throw "No elements in the sequence!";
                }
                else {
                    return source[source.length - 1];
                }
            }
            var match = source.filter(f);
            if (match.length === 0) {
                throw "Didn't match any element with the conditions!";
            }
            else {
                return match[match.length - 1];
            }
        },

        //
        //Returns with the last selected element according to the param function, otherwise null
        lastOrDefault: function (f) {
            if (!f) {
                if (source.length === 0) {
                    return;
                }
                else {
                    return source[source.length - 1];
                }
            }
            var match = source.filter(f);
            return match[match.length - 1];
        },

        //
        //Remove the given item in parameter if it's exits
        remove: function (itemOrFn) {
            if (typeof itemOrFn === 'function') {
                linq(source).where(itemOrFn).forEach(function (item) {
                    source.splice(source.indexOf(item), 1);
                });
            } else {
                source.splice(source.indexOf(itemOrFn), 1);
            }
            return source;
        },

        //
        //Clear the array
        clear: function () {
            source.length = 0;
        },

        //
        //Iterates throught on the array, and returns true if any items matches with the condition
        any: function (item) {
            return source.indexOf(item) !== -1;
        }
    };
}