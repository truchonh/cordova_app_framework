class ConfirmModal {
    constructor(message, title, action = ConfirmModal.actions.ok, icon = ConfirmModal.icon.info) {
        this.message = message;
        this.title = title;
        this.action = action;
        this.icon = icon;
        this.selectedAction = ConfirmModal.response.default;
        this.closeCallback = null;
        this._view = null;
        this._transitionTimeout = null;

        this._boundOnOk = () => this.onOk();
        this._boundOnYes = () => this.onYes();
        this._boundOnNo = () => this.onNo();
        this._boundOnClose = () => this.onClose();
    }

    show(closeCb) {
        this.closeCallback = closeCb;

        this._view = S('dialog#confirm-dialog');
        S(this._view, '#confirm-modal-title').textContent = this.title;
        S(this._view, '#confirm-modal-message').textContent = this.message;

        S(this._view, '#modal-ok-btn').addEventListener('click', this._boundOnOk);
        S(this._view, '#modal-yes-btn').addEventListener('click', this._boundOnYes);
        S(this._view, '#modal-no-btn').addEventListener('click', this._boundOnNo);

        switch (this.action) {
            case ConfirmModal.actions.ok: {
                S(this._view, '#modal-ok-btn').classList.remove('hide');
                break;
            }
            case ConfirmModal.actions.yesNo: {
                S(this._view, '#modal-yes-btn').classList.remove('hide');
                S(this._view, '#modal-no-btn').classList.remove('hide');
                break;
            }
        }

        this._view.addEventListener('close', this._boundOnClose);
        this._view.showModal();

        this._transitionTimeout = window.setTimeout(() => {
            this._view.classList.add('dialog-scale');
        }, 0.5);
    }

    onOk() {
        this.selectedAction = ConfirmModal.response.ok;
        this._view.close();
    }

    onYes() {
        this.selectedAction = ConfirmModal.response.yes;
        this._view.close();
    }

    onNo() {
        this.selectedAction = ConfirmModal.response.no;
        this._view.close();
    }

    onClose() {
        this._view.classList.remove('dialog-scale');
        clearTimeout(this._transitionTimeout);

        S(this._view, '#modal-ok-btn').removeEventListener('click', this._boundOnOk);
        S(this._view, '#modal-yes-btn').removeEventListener('click', this._boundOnYes);
        S(this._view, '#modal-no-btn').removeEventListener('click', this._boundOnNo);
        this._view.removeEventListener('close', this._boundOnClose);
        this.closeCallback(this.selectedAction);
    }
}
ConfirmModal.actions = Object.freeze({
    ok: 1,
    yesNo: 2,
});
ConfirmModal.icon = Object.freeze({
    info: 1,
    warning: 2,
    error: 3,
    question: 4,
});
ConfirmModal.response = Object.freeze({
    default: 0,
    ok: 1,
    no: 2,
    yes: 3,
});
