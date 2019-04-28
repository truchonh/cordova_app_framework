class NavBarComponent extends AbstractComponent {
    constructor() {
        super();

        this._previousScrollPosition = 0;
        this._el = null;
        this._position = 0;
        this._isAffixed = false;
        this._navbarHeight = 100;
        this._view = null;

        this._inertiaPrevention = false;
        this._tempValue = 0;
        this._accValues = [];
    }

    async attach(parent, node) {
        let mainNode = NavBarComponent.templates.main.cloneNode(true);
        S(mainNode, '#navbar-title').textContent = parent.viewTitle;
        S.replace(node, mainNode);

        this._el = S('#navbar');
        this._view = S('#view');

        this._inertiaPrevention = false;

        this.unlockToPosition(this._view.scrollTop);
    }

    destroy() {}

    updatePosition() {
        let currentScrollPosition = this._view.scrollTop || 0,
            previousScrollPosition = this._previousScrollPosition || 0,
            positionWithOffset = currentScrollPosition - this._navbarHeight,
            isScrollingDown = previousScrollPosition < currentScrollPosition,
            isScrollingUp = previousScrollPosition > currentScrollPosition;

        if (currentScrollPosition === 0) {
            this.unlockToPosition(0);
        } else if (isScrollingDown) {
            this._accValues = [];
            this._inertiaPrevention = false;
            if (this.isAffixed) {
                this.unlockToPosition(currentScrollPosition);
            } else if (this.position <= positionWithOffset) {
                this.position = 0;
            }
        } else if (isScrollingUp) {
            if (!this.isAffixed) {
                if (this.position <= positionWithOffset) {
                    // navbar is completely hidden..
                    this._accValues.unshift([window.performance.now(), positionWithOffset]);
                    this.setPosition(positionWithOffset);
                } else if (this.position < currentScrollPosition) {
                    this._accValues.unshift([window.performance.now(), positionWithOffset]);
                    let estimatedValue = this.estimateNextScrollPosition();
                    if (estimatedValue && this._position - estimatedValue > 0) {
                        this.affix();
                    }
                } else if (this.position >= currentScrollPosition) {
                    // navbar is partially visible..
                    this.affix();
                }
            }
        }

        this._previousScrollPosition = currentScrollPosition;
    }

    estimateNextScrollPosition() {
        if (this._accValues.length > 1) {
            let recentValues = this._accValues.slice(0, 3).reverse();
            let result = regression.linear(recentValues, { precision: 4 });
            // FIXME: kinda arbritrary, makes the navbar jump when scrolling slowly
            // if (result.r2 < 0.9) {
            //     this.affix();
            //     return;
            // }
            let total = 0;
            for (let i = 1; i < recentValues.length; i++) {
                let previousValue = recentValues[i - 1][0];
                let value = recentValues[i][0];
                total += value - previousValue;
            }
            let intervalAverage = total / (recentValues.length - 1);
            let estimatedNextTick = window.performance.now() + intervalAverage;
            return result.predict(estimatedNextTick)[1] + this._navbarHeight;
        }
        return null;
    }

    get positionStr() {
        return `${this._position || 0}px`;
    }

    get position() {
        if (this._isAffixed) {
            return (this._view.scrollTop || 0) + this._position;
        } else {
            return this._position || 0;
        }
    }

    setPosition(value) {
        if (this.position === 0 && !this._inertiaPrevention) {
            this._inertiaPrevention = true;
            this._tempValue = value;
            return;
        } else if (this._inertiaPrevention) {
            this._inertiaPrevention = false;
            if (Math.abs(value - this._tempValue) > this._navbarHeight * .5) {
                this.affix();
                return;
            }
            let estimatedValue = this.estimateNextScrollPosition();
            if (estimatedValue && this._position > estimatedValue) {
                this.affix();
                return;
            }
        }
        this.unlockToPosition(value);
    }

    set position(value) {
        this._position = value;
        this._el.style.top = this.positionStr;
    }

    affix() {
        this._el.classList.add('affixed');
        this.position = 0;
        this._isAffixed = true;
        // reset position glitch prevention variables
        this._accValues = [];
        this._inertiaPrevention = false;
    }

    unlockToPosition(position) {
        this._el.classList.remove('affixed');
        this.position = position;
        this._isAffixed = false;
    }

    get isAffixed() {
        return !!this._isAffixed;
    }
}
NavBarComponent.templates = {
    main: S('template#navbar-component').content
};