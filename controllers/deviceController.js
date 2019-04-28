window.deviceCtrl = class deviceCtrl {
    static init() {
        this._deviceReadyTimeout = null;
        this._onReadyListener = [];
        this._onBackButtonListener = [];
        this._currentState = deviceState.default;

        document.addEventListener('deviceready', () =>
            this.onDeviceReady()
        );
        document.addEventListener('backbutton', () => this.onBackButton());
    }

    static registerDeviceReady(callback) {
        switch (this._currentState) {
            case deviceState.default: {
                this._currentState = deviceState.deviceNotReady;
                this._onReadyListener.push(callback);
                this._deviceReadyTimeout = setTimeout(
                    () => this.onDeviceReadyTimeout(),
                    ms('1s')
                );
                break;
            }
            case deviceState.deviceNotReady: {
                this._onReadyListener.push(callback);
                break;
            }
        }
    }

    static async onDeviceReadyTimeout() {
        this._currentState = deviceState.browser;

        this._onReadyListener.forEach(cb => cb());
        this._onReadyListener = [];
    }

    static async onDeviceReady() {
        clearTimeout(this._deviceReadyTimeout);

        this._currentState = deviceState.deviceReady;
        this._onReadyListener.forEach(cb => cb());
    }

    static registerBackButton(callback) {
        this._onBackButtonListener.push(callback);
    }

    static onBackButton() {
        this._onBackButtonListener.forEach(cb => cb());
    }

    static get state() {
        return this._currentState;
    }

    static exitApp() {
        if (this._currentState === deviceState.deviceReady) {
            navigator.app.exitApp();
        }
    }
};