class BottomToolbarComponent extends AbstractComponent {
    constructor() {
        super();

        let _this = this;
        this._onNavClick = function() {
            _this.navigate(this);
        };
    }

    async attach(parent, node) {
        this._parent = parent;
        this.highlightCurrentItem();

        // FIXME: Add listener for the toolbar buttons
    }

    destroy() {
        // FIXME: Remove listener for the toolbar buttons
    }

    highlightCurrentItem() {
        for (let n of S.many('.toolbar-fixed ul li a')) {
            n.classList.remove('active');
        }

    }

    navigate(node) {
        for (let n of S.many('.toolbar-fixed ul li a')) {
            n.classList.remove('active');
        }

        switch (node.id) {
            default:
                throw new Error(`Invalid toolbar button id '${node.id}'`);
        }
    }
}
BottomToolbarComponent.templates = {
    main: S('#bottom-toolbar-component').content,
};
