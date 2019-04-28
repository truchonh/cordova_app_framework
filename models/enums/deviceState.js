const deviceState = Object.freeze({
    default: 0,
    deviceNotReady: 1,
    deviceReady: 2,
    browser: 3,

    /**
     * @param value {number}
     * @returns {string}
     */
    parse: function(value) {
        for (let key in this) {
            if (this.hasOwnProperty(key)) {
                if (this[key] === value) {
                    return key;
                }
            }
        }
    },
});
