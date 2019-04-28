window.storageCtrl = class storageCtrl {
    static init() {
        this._globalVarJunkyard = {};
    }

    static getValue(key) {
        let valueString = window.localStorage.getItem(key);
        if (valueString) {
            return JSON.parse(valueString).value;
        } else {
            return undefined;
        }
    }

    static setValue(key, value) {
        let actualValue = {
            value: value,
        };
        window.localStorage.setItem(key, JSON.stringify(actualValue));
    }

    static clearValue(key) {
        window.localStorage.removeItem(key);
    }

    static clearAll() {
        window.localStorage.clear();
    }

    static getVar(key) {
        return this._globalVarJunkyard[key];
    }

    static setVar(key, value) {
        this._globalVarJunkyard[key] = value;
    }

    /**
     * @returns {boolean}
     */
    static isCachingActive() {
        return this.getValue(storageKey.CACHING_ENABLED);
    }

    /**
     * @returns {boolean}
     */
    static isLogEnabled() {
        return this.getValue(storageKey.LOG_ENABLED);
    }
};