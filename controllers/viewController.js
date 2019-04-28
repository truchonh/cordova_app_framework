class viewCtrl {
    static init(rootView) {
        this._stack = [rootView];
        let start = window.performance.now();
        this._stack[0]
            .show()
            .then(() => {
                this._log({
                    view: this._stack[0],
                    renderTime: window.performance.now() - start,
                });
            })
            .catch(err => {
                console.error(err);
                if (err instanceof NetworkError) {
                    app.notify('Erreur réseau. Veuillez réessayer plus tard.');
                }
            });

        S('body').removeChild(S('#templates'));
    }

    static get size() {
        return this._stack.length;
    }

    static push(view) {
        this._stack[0].onDiscard();
        this._stack = this._stack.filter(v => v.viewTitle !== view.viewTitle); // prevent circular navigation
        this._stack.unshift(view);
        this._show();
    }

    static pop() {
        if (this.size > 2) {
            this._stack[0].onDiscard();
            this._stack.shift();
            this._show();
        } else {
            this.showRoot();
        }
    }

    static showRoot() {
        let start = window.performance.now();
        if (this.size > 1) {
            while (this.size > 1) {
                this._stack[0].onDiscard();
                this._stack.shift();
            }
        } else {
            this._stack[0].onDiscard();
        }
        this._stack[0]
            .show()
            .then(() => {
                this._log({
                    view: this._stack[0],
                    renderTime: window.performance.now() - start,
                });
            })
            .catch(err => {
                if (err instanceof NetworkError) app.notify('Erreur réseau. Veuillez réessayer plus tard.');
            });
    }

    static async refresh() {
        this._stack[0].onDiscard();
        await this._refresh();
    }

    static async _refresh() {
        try {
            let start = window.performance.now();
            await this._stack[0].refresh();
            this._log({
                view: this._stack[0],
                renderTime: window.performance.now() - start,
            });
        } catch (err) {
            console.error(err);
            if (err instanceof NetworkError) {
                if (this.size > 1) {
                    this._stack.shift();
                }
                this._stack.unshift(new NetworkErrorView());
                await this._stack[0].show();
            } else throw err;
        }
    }

    static peek() {
        return this._stack[0];
    }

    static async _show() {
        try {
            let start = window.performance.now();
            await this._stack[0].show();
            this._log({
                view: this._stack[0],
                renderTime: window.performance.now() - start,
            });
        } catch (err) {
            console.error(err);
            if (err instanceof NetworkError) {
                if (this.size > 1) {
                    this._stack.shift();
                }
                this._stack.unshift(new NetworkErrorView());
                await this._stack[0].show();
            } else throw err;
        }
    }

    static _log(options) {
        let { view, renderTime } = options;

        let html = '';

        html += `<span style="color:#f4d442">Rendering</span> `;
        html += `<i>${view.constructor.name}</i> `;
        html += `<span style="color:#888888">${renderTime.toFixed(1)}ms</span>`;

        app.log(html);
    }
}