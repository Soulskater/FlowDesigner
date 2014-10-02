//
//Factory for LinqArray
var linq = function () {

    var args = [ undefined ];
    for (var i = 0; i < arguments.length; i++) {
        args.push(arguments[i]);
    }
    var F = Function.prototype.bind.apply(LinqArray, args);
    return new F();
};

function LinqArray() {

    if (arguments.length === 0) {
        return;
    }
    if (arguments.length > 1) {
        for (var i = 0, len = arguments.length; i < len; i++) {
            this.push(arguments[i]);
        }
    }
}

LinqArray.prototype = [];

//
//Creates a new collection, executes the given function and push the result into the new array
LinqArray.prototype.map = function (f) {
    var result = [];
    for (var i = 0, len = this.length; i < len; i++) {
        result.push(f(this[i], i));
    }
    return linq(result);
};

//
//Iterates throught on the array, and executes the parameter function on each element
LinqArray.prototype.forEach = function (f) {
    for (var i = 0, len = this.length; i < len; i++) {
        f(this[i], i);
    }
};

//
//Filter the array according to the param function
LinqArray.prototype.where = function (f) {
    return linq(this.filter(f));
};

//
//Returns with the first selected element according to the param function, otherwise throws an exception
LinqArray.prototype.first = function (f) {
    if (!f) {
        if (this.length === 0) {
            throw "No elements in the sequence!";
        }
        else {
            return this[0];
        }
    }

    var match = this.filter(f);
    if (match.length === 0) {
        throw "Didn't match any element with the conditions!";
    }
    else {
        return match[0];
    }
};

//
//Returns with the first selected element according to the param function, otherwise null
LinqArray.prototype.firstOrDefault = function (f) {
    if (!f) {
        if (this.length === 0) {
            return null;
        }
        else {
            return this[0];
        }
    }
    return this.filter(f)[0];
};

//
//Returns with the last selected element according to the param function, otherwise throws an exception
LinqArray.prototype.last = function (f) {
    if (!f) {
        if (this.length === 0) {
            throw "No elements in the sequence!";
        }
        else {
            return this[this.length - 1];
        }
    }
    var match = this.filter(f);
    if (match.length === 0) {
        throw "Didn't match any element with the conditions!";
    }
    else {
        return match[match.length - 1];
    }
};

//
//Returns with the last selected element according to the param function, otherwise null
LinqArray.prototype.lastOrDefault = function (f) {
    if (!f) {
        if (this.length === 0) {
            return;
        }
        else {
            return this[this.length - 1];
        }
    }
    var match = this.filter(f);
    return match[match.length - 1];
};

//
//Remove the given item in parameter if it's exits
LinqArray.prototype.remove = function (itemOrFn) {
    if (typeof itemOrFn === 'function') {
        this.where(itemOrFn).forEach(function (item) {
            this.splice(this.indexOf(item), 1);
        });
    } else {
        this.splice(this.indexOf(itemOrFn), 1);
    }
};

//
//Clear the array
LinqArray.prototype.clear = function () {
    this.length = 0;
};

//
//Iterates throught on the array, and returns true if any items matches with the condition
LinqArray.prototype.any = function (item) {
    return this.indexOf(item) !== -1;
};
