class NetworkErrorView extends AbstractView {
    constructor() {
        super({});
        super.viewTitle = 'Temp';
    }

    async _refresh() {
        await super._refresh();
        let view = NetworkErrorView.templates.view.cloneNode(true);
        S.content('#view-body', view);
    }
}
NetworkErrorView.templates = {
    view: S('template#network-error-view').content,
};
