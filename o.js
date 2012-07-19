/// <reference path="jquery-1.5.1-vsdoc.js" />

$.fn.directDataOs = function () {
    return $(this).find('[data-o]').not($(this).find('[data-o] [data-o]'));
}

$.override = function (obj1, obj2) {
    if ($.isPlainObject(obj2)) return $.extend(true, {}, obj1, obj2);
    else if ($.isArray(obj2)) return $.extend(true, [], obj1, obj2);
    else return obj2;
}

RegExp.escape = function(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

var O = {

    GetDefaultFunc: function (data) {
        /// <summary>
        /// Gets the default function ignoring the function in the data.
        /// </summary>
        if (typeof data !== 'undefined') {
            if ($.isArray(data) && this.attr('data-o')) return O.Each;
            else if (!this.find('*[data-o]').length) return O.Leaf;
            else return O.Container;
        }
        else {
            if (this.find('*[data-o]').length) return O.Container;
            else return O.Leaf;
        }
        return O.Auto;
    },

    GetFunc: function (data) {
        /// <summary>
        /// Gets the default function or the function in the data if any.
        /// </summary>
        return this.data('o-func') || O.GetDefaultFunc.apply(this, [data]);
    },

    ResolveExpressions: function (text, data, encode) {
        if (text) {
            var reg = "\\[(.*?)\\]";
            var matches = text.match(new RegExp(reg, 'g'));
            if (matches) {
                var exps = [];
                for (var i = 0; i < matches.length; i++) {
                    var match = matches[i];
                    var o = data;
                    var exp = match.substring(1, match.length - 1);
                    var result = eval(exp);
                    var esc = RegExp.escape(exp);
                    var reg = "\\[" + esc + "\\]";
                    text = text.replace(new RegExp(reg, 'g'), encode ? encodeURIComponent(result) : result);
                }
            }
        }
        return text;
    },

    ResolveExpression: function ($elem, getExp, setExp, isUri, dataKey, data) {
        if (!$elem.data(dataKey)) $elem.data(dataKey, getExp());
        var text = $elem.data(dataKey);
        var resolved = O.ResolveExpressions(text, data, isUri);
        setExp(resolved);
    },

    ResolveAttribute: function ($elem, attrName, isUri, data) {
        O.ResolveExpression(
            $elem,
            function () { return $elem.attr(attrName); },
            function (val) { return $elem.attr(attrName, val); },
            isUri,
            'o-readonly-orig-attr-' + attrName,
            data
        );
    },

    ResolveText: function ($elem, data) {
        O.ResolveExpression(
            $elem,
            function () { return $elem.text(); },
            function (val) { return $elem.text(val); },
            false,
            'o-readonly-orig-text',
            data
        );
    },

    Leaf: function (data) {
        if (typeof data !== 'undefined') {
            //            if (this.children().length) {
            //                this.data('o-readonly-data', data);
            //                this.find('*').each(function () {
            //                    O.Leaf.apply($(this), [data]);
            //                });
            //            }
            //            else {
            switch (this.get(0).nodeName.toUpperCase()) {
                case 'INPUT':
                    var type = this.attr('type');
                    if (type && type.toLowerCase() == 'checkbox') {
                        if (data) this.attr('checked', 'checked');
                        else this.removeAttr('checked');
                    }
                    else this.val(data);
                    break;
                case 'A':
                    this.data('o-readonly-data', data);
                    O.ResolveAttribute(this, 'href', true, data);
                    O.ResolveText(this, data);
                    break;
                case 'BUTTON':
                    this.data('o-readonly-data', data);
                    O.ResolveAttribute(this, 'onclick', false, data);
                    break;
                case 'TEXTAREA':
                    this.val(data);
                    break;
                case 'SELECT':
                    if ($.isArray(data)) {
                        this.empty();
                        for (var i = 0; i < data.length; i++) {
                            var $opt = $('<option>');
                            $opt.val(data[i]);
                            $opt.text(data[i]);
                            $(this).append($opt);
                        }
                    }
                    else if ($.isPlainObject(data)) {
                        this.empty();
                        for (var id in data) {
                            var $opt = $('<option>');
                            $opt.val(id);
                            $opt.text(data[id]);
                            $(this).append($opt);
                        }
                    }
                    else this.val(data);
                    break;
                case 'OPTION':
                    this.val(data);
                    O.ResolveText(this, data);
                    break;
                default:
                    this.data('o-readonly-data', data);
                    O.ResolveText(this, data);
                    break;
            }
            //            }
        }
        else {
            switch (this.get(0).nodeName.toUpperCase()) {
                case 'INPUT':
                    var type = this.attr('type');
                    if (type && type.toLowerCase() == 'checkbox') {
                        return this.attr('checked');
                    }
                    else return this.val();
                case 'TEXTAREA':
                    return this.val();
                case 'SELECT':
                    return this.val();
                case 'OPTION':
                    return this.val();
                case 'A':
                case 'BUTTON':
                default:
                    return this.data('o-readonly-data');
            }
        }
    },

    Each: function (data) {
        if (typeof data === 'undefined') return [];
        else {
            var expression = this.attr('data-o');
            this.parent().children().each(function () {
                if ($(this).data('o-parent') == expression) $(this).remove();
            });
            var $last = this;
            oFunc = this.data('o-func');
            this.removeData('o-func');
            this.removeAttr('data-o');

            for (var i = 0; i < data.length; i++) {
                var $clone = this.clone(true, true);

                var innerFunc = $clone.data('o-clone-func');
                if (innerFunc) {
                    $clone.data('o-func', innerFunc);
                    $clone.removeData('o-clone-func');
                }

                $clone.removeAttr('id');
                $clone.show();
                O.Auto.apply($clone, [data[i]]);
                $clone.data('o-parent', expression);
                $clone.attr('data-o', expression + "[" + i + "]");
                $clone.insertAfter($last);
                $last = $clone;
            }
            this.data('o-func', oFunc);
            this.attr('data-o', expression);
            this.hide();
        }
    },

    Container: function (data) {
        var o;
        if (typeof data === 'undefined') o = {};
        else o = data;
        this.directDataOs().each(function () {
            var expression = $(this).attr('data-o') || "o";
            if (typeof data === 'undefined') {
                var part = O.Auto.apply($(this));
                if (typeof part !== 'undefined') {
                    var old_o = o;
                    eval(expression + " = part");
                    o = $.override(old_o, o);
                }
            }
            else O.Auto.apply($(this), [eval(expression)]);
        });
        return o;
    },

    Auto: function (data) {
        /// <summary>
        /// Calls the default function or the function in the data if any. Also, assigns the called function to the data.
        /// Doing "return O.Auto.apply($elem, [data]);" is equivalent to doing "return $elem.o(data)".
        /// </summary>
        var func = O.GetFunc.apply(this, [data]);
        if (func != O.Auto) {
            this.data('o-func', func);
            return func.apply(this, [data]);
        }
    },

    CallDefault: function (data) {
        /// <summary>
        /// Calls the default function for this element without assigning any function and ignoring the function in the data.
        /// The actual default is O.Auto. Use this only to ignore the function in the data.
        /// Must be called like "return O.CallDefault.apply(this, [data]);"
        /// </summary>
        var func = O.GetDefaultFunc.apply(this, [data]);
        if (func != O.CallDefault) return func.apply(this, [data]);
    }
}

$.fn.o = function (data) {
    /// <summary>
    /// If data is passed, assigns the data to the child elements starting from this element. If not, reads the data from the elements.
    /// To have an element use a custom function, assign the function to the 'o-func' jQuery data of the element. This function will
    /// take a data parameter and the "this" pointer will point to the jQuery selector for the element. If data is undefined, it must
    /// return the "o" data of the element, otherwise, it must assign data to the element. If the function returns undefined when
    /// reading, the result will not be added to the final resulting object.
    /// </summary>
        return O.Auto.apply($(this), [data]);
}
