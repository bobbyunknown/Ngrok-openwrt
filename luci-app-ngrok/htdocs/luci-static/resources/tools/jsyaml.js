'use strict';

return L.Class.extend({
    parse: function(str) {
        return JSON.parse(str);
    },

    dump: function(obj) {
        return JSON.stringify(obj, null, 2);
    }
});