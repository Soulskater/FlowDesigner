var linq = function (array) {
    "use strict";

    var args = arguments;

    _init();
    function _init() {
        if (args.length === 0) {
            return;
        }
        if (args.length > 1) {
            for (var i = 0, len = args.length; i < len; i++) {
                array.push(args[i]);
            }
        }
    }

    return{
        get: function () {
            return array;
        },
        //
        //Creates a new collection, executes the given function and push the result into the new array
        map: function (f) {
            var result = [];
            for (var i = 0, len = array.length; i < len; i++) {
                result.push(f(array[i], i));
            }
            return linq(result);
        },

        //
        //Iterates throught on the array, and executes the parameter function on each element
        forEach: function (f) {
            for (var i = 0, len = array.length; i < len; i++) {
                f(array[i], i);
            }
        },

        //
        //Filter the array according to the param function
        where: function (f) {
            return linq(array.filter(f));
        },

        //
        //Returns with the first selected element according to the param function, otherwise throws an exception
        first: function (f) {
            if (!f) {
                if (array.length === 0) {
                    throw "No elements in the sequence!";
                }
                else {
                    return array[0];
                }
            }

            var match = array.filter(f);
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
                if (array.length === 0) {
                    return null;
                }
                else {
                    return array[0];
                }
            }
            return array.filter(f)[0];
        },

        //
        //Returns with the last selected element according to the param function, otherwise throws an exception
        last: function (f) {
            if (!f) {
                if (array.length === 0) {
                    throw "No elements in the sequence!";
                }
                else {
                    return array[array.length - 1];
                }
            }
            var match = array.filter(f);
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
                if (this.length === 0) {
                    return;
                }
                else {
                    return array[array.length - 1];
                }
            }
            var match = array.filter(f);
            return match[match.length - 1];
        },
        //
        //Remove the given item in parameter if it's exits
        remove: function (itemOrFn) {
            if (typeof itemOrFn === 'function') {
                linq(array).where(itemOrFn).forEach(function (item) {
                    array.splice(array.indexOf(item), 1);
                });
            } else {
                array.splice(array.indexOf(itemOrFn), 1);
            }
        },
        //
        //Clear the array
        clear: function () {
            array.length = 0;
        },
        //
        //Iterates throught on the array, and returns true if any items matches with the condition
        any: function (item) {
            return array.indexOf(item) !== -1;
        }
    };
};
