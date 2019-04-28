class ExampleView extends AbstractView {
    constructor() {
        super({
            pullToRefreshEnabled: true,
        });
        super.viewTitle = 'Example view';
    }

    async _refresh() {
        await super._refresh();
        let view = ExampleView.templates.view.cloneNode(true);
        S.content('#view-body', view);

        S('#back-button').classList.add('hide');
        S('#app-navbar-logo').classList.remove('hide');

        await sleep(ms('1s'));

        console.log('View loaded');
    }
}
ExampleView.templates = {
    view: S('template#example-view').content,
};
