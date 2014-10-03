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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImxpbnEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImxpbnEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJmdW5jdGlvbiBsaW5xKCkge1xyXG5cclxuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgdmFyIHNvdXJjZSA9IFtdO1xyXG4gICAgX2luaXQoKTtcclxuICAgIGZ1bmN0aW9uIF9pbml0KCkge1xyXG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZS5wdXNoKGFyZ3NbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoYXJnc1swXSBpbnN0YW5jZW9mIEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBhcmdzWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybntcclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vQ3JlYXRlcyBhIG5ldyBjb2xsZWN0aW9uLCBleGVjdXRlcyB0aGUgZ2l2ZW4gZnVuY3Rpb24gYW5kIHB1c2ggdGhlIHJlc3VsdCBpbnRvIHRoZSBuZXcgYXJyYXlcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy9DcmVhdGVzIGEgbmV3IGNvbGxlY3Rpb24sIGV4ZWN1dGVzIHRoZSBnaXZlbiBmdW5jdGlvbiBhbmQgcHVzaCB0aGUgcmVzdWx0IGludG8gdGhlIG5ldyBhcnJheVxyXG4gICAgICAgIG1hcDogZnVuY3Rpb24gKGYpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gc291cmNlLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChmKHNvdXJjZVtpXSwgaSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBsaW5xKHJlc3VsdCk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL0l0ZXJhdGVzIHRocm91Z2h0IG9uIHRoZSBhcnJheSwgYW5kIGV4ZWN1dGVzIHRoZSBwYXJhbWV0ZXIgZnVuY3Rpb24gb24gZWFjaCBlbGVtZW50XHJcbiAgICAgICAgZm9yRWFjaDogZnVuY3Rpb24gKGYpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHNvdXJjZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgZihzb3VyY2VbaV0sIGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL0ZpbHRlciB0aGUgYXJyYXkgYWNjb3JkaW5nIHRvIHRoZSBwYXJhbSBmdW5jdGlvblxyXG4gICAgICAgIHdoZXJlOiBmdW5jdGlvbiAoZikge1xyXG4gICAgICAgICAgICByZXR1cm4gbGlucShzb3VyY2UuZmlsdGVyKGYpKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vUmV0dXJucyB3aXRoIHRoZSBmaXJzdCBzZWxlY3RlZCBlbGVtZW50IGFjY29yZGluZyB0byB0aGUgcGFyYW0gZnVuY3Rpb24sIG90aGVyd2lzZSB0aHJvd3MgYW4gZXhjZXB0aW9uXHJcbiAgICAgICAgZmlyc3Q6IGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgIGlmICghZikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIk5vIGVsZW1lbnRzIGluIHRoZSBzZXF1ZW5jZSFcIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VbMF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBtYXRjaCA9IHNvdXJjZS5maWx0ZXIoZik7XHJcbiAgICAgICAgICAgIGlmIChtYXRjaC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHRocm93IFwiRGlkbid0IG1hdGNoIGFueSBlbGVtZW50IHdpdGggdGhlIGNvbmRpdGlvbnMhXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2hbMF07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vUmV0dXJucyB3aXRoIHRoZSBmaXJzdCBzZWxlY3RlZCBlbGVtZW50IGFjY29yZGluZyB0byB0aGUgcGFyYW0gZnVuY3Rpb24sIG90aGVyd2lzZSBudWxsXHJcbiAgICAgICAgZmlyc3RPckRlZmF1bHQ6IGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgIGlmICghZikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VbMF07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZS5maWx0ZXIoZilbMF07XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL1JldHVybnMgd2l0aCB0aGUgbGFzdCBzZWxlY3RlZCBlbGVtZW50IGFjY29yZGluZyB0byB0aGUgcGFyYW0gZnVuY3Rpb24sIG90aGVyd2lzZSB0aHJvd3MgYW4gZXhjZXB0aW9uXHJcbiAgICAgICAgbGFzdDogZnVuY3Rpb24gKGYpIHtcclxuICAgICAgICAgICAgaWYgKCFmKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc291cmNlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiTm8gZWxlbWVudHMgaW4gdGhlIHNlcXVlbmNlIVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZVtzb3VyY2UubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIG1hdGNoID0gc291cmNlLmZpbHRlcihmKTtcclxuICAgICAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJEaWRuJ3QgbWF0Y2ggYW55IGVsZW1lbnQgd2l0aCB0aGUgY29uZGl0aW9ucyFcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBtYXRjaFttYXRjaC5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vXHJcbiAgICAgICAgLy9SZXR1cm5zIHdpdGggdGhlIGxhc3Qgc2VsZWN0ZWQgZWxlbWVudCBhY2NvcmRpbmcgdG8gdGhlIHBhcmFtIGZ1bmN0aW9uLCBvdGhlcndpc2UgbnVsbFxyXG4gICAgICAgIGxhc3RPckRlZmF1bHQ6IGZ1bmN0aW9uIChmKSB7XHJcbiAgICAgICAgICAgIGlmICghZikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc291cmNlW3NvdXJjZS5sZW5ndGggLSAxXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBzb3VyY2UuZmlsdGVyKGYpO1xyXG4gICAgICAgICAgICByZXR1cm4gbWF0Y2hbbWF0Y2gubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL1JlbW92ZSB0aGUgZ2l2ZW4gaXRlbSBpbiBwYXJhbWV0ZXIgaWYgaXQncyBleGl0c1xyXG4gICAgICAgIHJlbW92ZTogZnVuY3Rpb24gKGl0ZW1PckZuKSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbU9yRm4gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIGxpbnEoc291cmNlKS53aGVyZShpdGVtT3JGbikuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZS5zcGxpY2Uoc291cmNlLmluZGV4T2YoaXRlbSksIDEpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2Uuc3BsaWNlKHNvdXJjZS5pbmRleE9mKGl0ZW1PckZuKSwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvL1xyXG4gICAgICAgIC8vQ2xlYXIgdGhlIGFycmF5XHJcbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgc291cmNlLmxlbmd0aCA9IDA7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgLy9cclxuICAgICAgICAvL0l0ZXJhdGVzIHRocm91Z2h0IG9uIHRoZSBhcnJheSwgYW5kIHJldHVybnMgdHJ1ZSBpZiBhbnkgaXRlbXMgbWF0Y2hlcyB3aXRoIHRoZSBjb25kaXRpb25cclxuICAgICAgICBhbnk6IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzb3VyY2UuaW5kZXhPZihpdGVtKSAhPT0gLTE7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==