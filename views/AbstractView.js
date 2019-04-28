class AbstractView {
    /**
     * @param {object} [options]
     * @param {boolean} [options.infiniteScrollEvent]
     * @param {boolean} [options.toolbarVisible]
     * @param {boolean} [options.pullToRefreshEnabled]
     */
    constructor(options) {
        this._options = _.extend(
            {
                infiniteScrollEvent: false,
                toolbarVisible: false,
                pullToRefreshEnabled: false,
            },
            options || {}
        );

        /**
         * Title displayed in navbar
         * @type {String}
         * @protected
         */
        this._viewTitle = null;

        this._scrollToBottomHandled = true;
        this._endOfPage = false;

        this._components = new Map();

        this._loaded = false;
        this._scrollLocation = 0;
        this._viewEl = S('#view');

        this._navbarCtrl = null;
    }

    /**
     * Render the view.
     * @returns {Promise<void>}
     */
    async show() {
        await this._refresh();
        await this._loadComponents(this);

        this._moveActionBtn();
        this._hideLoader();
    }

    /**
     * Re-render the view without using cached data.
     * Called when pull-to-refresh is triggered.
     * @returns {Promise<void>}
     */
    async refresh() {
        storageCtrl.setValue(storageKey.CACHING_ENABLED, false);

        try {
            await this.show();
        } catch (err) {
            storageCtrl.setValue(storageKey.CACHING_ENABLED, true);
            throw err;
        }

        storageCtrl.setValue(storageKey.CACHING_ENABLED, true);
        this._loaded = true;
    }

    _moveActionBtn() {
        let actionBtnEl = S('#view-body .fixed-action-btn');
        if (actionBtnEl) {
            actionBtnEl.parentNode.removeChild(actionBtnEl);
            S.many('#bottom-toolbar .fixed-action-btn').forEach(btn => btn.parentNode.removeChild(btn));
            S('#bottom-toolbar').appendChild(actionBtnEl);
            actionBtnEl.classList.remove('hide');
        }
    }

    /**
     * @returns {Promise<void>}
     * @protected
     */
    async _refresh() {
        // set event listeners
        this._loaded = false;

        this._viewEl.onscroll = e => this.scrollEventHandler(e);
        this._scrollToBottomHandled = true;
        this._endOfPage = false;

        let toolbarNode = S('div[data-component=bottom-toolbar-component]');
        if (toolbarNode) {
            if (this._options.toolbarVisible === true) {
                S('div[data-component=bottom-toolbar-component]').classList.remove('hide');
            } else {
                S('div[data-component=bottom-toolbar-component]').classList.add('hide');
            }
        }

        let viewBase = AbstractView.templates.base.cloneNode(true);
        if (S('#splash-screen')) {
            S(viewBase, '.page-preloading-mask').classList.remove('active');
        }
        S.content('#view', viewBase);

        // initialize the navbar
        this._navbarCtrl = AbstractComponent.createController('navbar-component');
        await this._navbarCtrl.attach(this, S('div[data-component=navbar-component]'));

        if (this._options.pullToRefreshEnabled) {
            WebPullToRefresh.init({
                loadingFunction: async () => {
                    await viewCtrl.refresh();
                },
                bodyEl: this._viewEl,
                contentEl: S('#view-body'),
                distanceToRefresh: 40,
                resistance: 5,
            });
        }
    }

    async _loadComponents(parent) {
        this._components = new Map();
        try {
            let loadComponent = async comp => {
                let id = comp.getAttribute('data-component');
                let controller = AbstractComponent.createController(id);
                await controller.attach(parent, comp);
                this._components.set(id, controller);
            };

            await P(S.many('[data-component]').map(componentNode => loadComponent(componentNode)));
        } catch (err) {
            console.log(err);
            // TODO: Do something here... If the network is not available, an error will happen and it will be
            //  impossible to access the settings menu !
        }
    }

    getComponentCtrl(id) {
        return this._components.get(id);
    }

    /**
     * @returns {boolean}
     * @protected
     */
    isScrolledToBottom() {
        return this._viewEl.scrollTop >= this._viewEl.scrollHeight - this._viewEl.offsetHeight - 100;
    }

    scrollEventHandler() {
        if (this._navbarCtrl) {
            this._navbarCtrl.updatePosition();
        }
    }

    _hideLoader() {
        if (S('#splash-screen')) {
            S('#splash-screen').style.opacity = 0;
            setTimeout(() => S('body').removeChild(S('#splash-screen')), ms('200ms'));
        } else {
            S('.page-preloading-mask').classList.remove('active');
        }

        if (this._scrollLocation > 0 && this._scrollLocation <= this._viewEl.scrollHeight - this._viewEl.offsetHeight) {
            this._viewEl.scrollTo({
                top: this._scrollLocation,
            });
        }

        this._loaded = true;
    }

    isLoaded() {
        return this._loaded;
    }

    onDiscard() {
        this._viewEl.onscroll = null;
        this._scrollLocation = this._viewEl.scrollTop || 0;
        for (let component of this._components.values()) {
            component.destroy();
        }
    }

    /**
     * @returns {String}
     * @public
     */
    get viewTitle() {
        return this._viewTitle;
    }

    /**
     * @param value {string}
     * @protected
     */
    set viewTitle(value) {
        this._viewTitle = value;
        let navBarNode = S('#navbar-title');
        if (navBarNode) {
            navBarNode.textContent = this._viewTitle;
        }
    }
}
AbstractView.templates = {
    base: S('#view-base').content,
};
