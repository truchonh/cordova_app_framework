class logCtrl {
    static init() {
        logCtrl._restoreBodyScrollTimeout = null;
        // NOTE: Only vanilla js can be used here, because this is the first script to be required !

        document.querySelector('#clear-log-btn').addEventListener('click', () => {
            document.querySelector('#console-log-container > pre').innerHTML = '';
        });

        // must use oldschool function here to keep the "arguments" variable.
        let that = this;

        // capture regular log output
        let logFunc = console.log;
        console.log = function(message) {
            that.writeToLogWindow(logCtrl._level.info, message);
            logFunc(...arguments);
        };

        // capture warning log output
        let warnLogFunc = console.warn;
        console.warn = function(message) {
            that.writeToLogWindow(logCtrl._level.warn, message);
            warnLogFunc(...arguments);
        };

        // capture the error output
        let errLogFunc = console.error;
        console.error = function(message) {
            that.writeToLogWindow(logCtrl._level.error, message);
            errLogFunc(...arguments);
        };
    }

    static initGesture() {
        let h = new Hammer(S('body'), {
            inputClass: Hammer.TouchInput,
            touchAction: 'auto',
            domEvents: true
        });
        h.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL, pointers: 3, threshold: 0 });

        h.on('panstart', (e) => {
            let body = S('#view');
            body.style.overflow = 'hidden';
            logCtrl._restoreBodyScrollTimeout = setTimeout(() => {
                body.style.overflow = 'auto';
                console.warn(`Something weird happened while handling the triple pan. Body scrolling` +
                    ` restored by timeout.`);
            }, ms('3s'));
        });
        h.on('panend', (e) => this._handleTriplePan(e));
    }

    static _handleTriplePan(e) {
        S('#view').style.overflow = 'auto';
        if (logCtrl._restoreBodyScrollTimeout !== null) {
            clearTimeout(logCtrl._restoreBodyScrollTimeout);
            logCtrl._restoreBodyScrollTimeout = null;
        }
        if (e.deltaY >= 300 && storageCtrl.isLogEnabled()) {
            storageCtrl.setValue(storageKey.LOG_ENABLED, false);
            S('body').classList.remove('show-log');
        } else if (e.deltaY <= -300 && !storageCtrl.isLogEnabled()) {
            storageCtrl.setValue(storageKey.LOG_ENABLED, true);
            S('body').classList.add('show-log');
            let logEl = S('#console-log-container > pre');
            logEl.parentElement.scrollTo({
                top: logEl.parentElement.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    static writeToLogWindow(level, message) {
        let logColor;
        switch (level) {
            case logCtrl._level.info:
                logColor = '#ffffff';
                break;
            case logCtrl._level.warn:
                logColor = '#ffeb3b';
                break;
            case logCtrl._level.error:
                logColor = '#f44336';
                break;
        }

        if (message instanceof Error) {
            let html = '';
            html += `<span style="color:${logColor}">${message.message}</span><br/>`;
            let stack = message.stack.split('\n');
            stack.shift();
            html += `<span style="color:${logColor}">${stack.join('<br/>')}</span>`;
            app.log(html);
        } else if (typeof message === 'object') {
            let constructorName = ``;
            if (message.constructor && message.constructor.name) {
                constructorName = `${message.constructor.name} `;
            }
            app.log(`<span style="color:${logColor}">${
                constructorName
            }${
                JSON.stringify(message, null, 2)
            }</span>`);
        } else {
            app.log(`<span style="color:${logColor}">${message}</span>`);
        }
    }
}
logCtrl._level = Object.freeze({
    info: 'info',
    warn: 'warn',
    error: 'error',
});
