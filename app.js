class app {
    /**
     * Initializing that occurs once at app startup.
     */
    static async initialize() {
        app.log(
            `<span style="font-style:italic">Device ready in ${
                window.performance.now().toFixed(1)
            }ms</span>`
        );
        app._exitModalVisible = false;

        viewCtrl.init(new ExampleView());

        S.content(
            S('div[data-component=bottom-toolbar-component]'),
            BottomToolbarComponent.templates.main.cloneNode(true)
        );

        if (storageCtrl.isLogEnabled()) {
            S('body').classList.add('show-log');
        }

        logCtrl.initGesture();
    }

    /**
     * Handle the navigation to the previous state
     */
    static navigateBack() {
        if (S.many('.toast').length > 0) {
            M.Toast.dismissAll();
        } else if (viewCtrl.size > 1) {
            let dialog = S('dialog[open]');
            if (dialog) {
                dialog.close();
            } else {
                viewCtrl.pop();
            }
        } else if (deviceCtrl.state === deviceState.deviceReady) {
            if (app._exitModalVisible) {
                return deviceCtrl.exitApp();
            }

            app._exitModalVisible = true;
            app.displayConfirm(
                'Voulez-vous vraiment quitter ?',
                'Confirmation',
                ConfirmModal.actions.yesNo,
                ConfirmModal.icon.question
            ).then(res => {
                if (res === ConfirmModal.response.yes) {
                    deviceCtrl.exitApp();
                } else {
                    app._exitModalVisible = false;
                }
            });
        }
    }

    /**
     * Display a toast notification
     * @param {string} message Raw text or html
     */
    static notify(message) {
        M.toast({ html: message });
        // FIXME: use native toast when running on cordova
    }

    /**
     * Display an error message in a modal window
     * @param {string} message
     * @param {string} [code] Display in the title in brackets if present
     */
    static displayError(message, code) {
        let errorDialog = S('dialog[open]#error-dialog');
        if (errorDialog) {
            errorDialog.close();
        }
        new ErrorModal(message, code).show();
    }

    /**
     * Prompt the user with a confirmation modal
     * @param {string} message
     * @param {string} title
     * @param {ConfirmModal.actions} action
     * @param {ConfirmModal.icon} icon
     * @returns {Promise<*>}
     */
    static async displayConfirm(message, title, action, icon) {
        return new Promise(resolve => {
            let modal = new ConfirmModal(message, title, action, icon);
            modal.show(res => resolve(res));
        });
    }

    /**
     * Log a message to the app's console
     * @param {string} message
     */
    static log(message) {
        let logEl = this._getLogEl();
        let formattedTimestamp = new Date().toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });
        logEl.innerHTML += `<span style="color:#888888">[${formattedTimestamp}]</span> ${message}<br/>`;

        logEl.parentElement.scrollTo({ top: logEl.parentElement.scrollHeight, behavior: 'smooth' });
    }

    /**
     * @returns {Element}
     * @private
     */
    static _getLogEl() {
        if (!this._logEl) {
            this._logEl = S('#console-log-container > pre');
        }
        return this._logEl;
    }
}

(async function () {
    // Initialise the app
    try {
        storageCtrl.init();
        cacheCtrl.init();
        deviceCtrl.init();

        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            deviceCtrl.registerDeviceReady(app.initialize);
            deviceCtrl.registerBackButton(app.navigateBack);
        } else {
            await app.initialize();
        }
    } catch (err) {
        console.error(err);
    }
})();