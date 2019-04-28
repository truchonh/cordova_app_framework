class AbstractComponent {
    constructor() {
        this._parent = null;
    }

    static createController(id) {
        if (!AbstractComponent._controllers[id]) {
            /**
             * All components must be registed here for the automatic component
             * initialization to work.
             */
            switch (id) {
                case 'navbar-component': {
                    AbstractComponent._controllers[id] = new NavBarComponent();
                    break;
                }
                case 'bottom-toolbar-component': {
                    AbstractComponent._controllers[id] = new BottomToolbarComponent();
                    break;
                }
                default:
                    return new Error(`Component ${id} does not exist.`);
            }
        }
        return AbstractComponent._controllers[id];
    }

    /**
     * @abstract
     * @param parent {AbstractView}
     * @param node {Node}
     */
    async attach(parent, node) {}

    /**
     * @abstract
     */
    destroy() {}
}
AbstractComponent._controllers = {};
