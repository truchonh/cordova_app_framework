class ErrorModal {
    constructor(message, code) {
        this.message = message;
        this.code = code;
        this._view = null;

        this._boundOnClose = () => this.onClose();
    }

    show() {
        this._view = S('dialog#error-dialog');
        S(this._view, '#error-modal-title').textContent = `Oups! Une erreur s'est produite ${
            this.code !== undefined ? `(${this.code})` : ''
        }`;
        S(this._view, '#error-modal-message').innerHTML = this.message;

        this._view.addEventListener('close', () => {
            S(this._view, '.modal-close').removeEventListener('click', this._boundOnClose);
        });
        this._view.showModal();

        S(this._view, '.modal-close').addEventListener('click', this._boundOnClose);
    }

    onClose() {
        this._view.close();
    }
}
