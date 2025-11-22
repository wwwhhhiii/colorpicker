export class VerticalCurtain {
    constructor(elem, direction) {
        this._left = direction == 0;
        this._right = direction == 1;
        this._elem = elem;

        this._panDiv = document.createElement("div");
        this._panDiv.style.position = "absolute";
        this._panDiv.style.display = "block";
        this._panDiv.style.backgroundColor = "red";
        this._panDiv.style.cursor = "col-resize";
        this._panDiv.style.height = "100%";
        this._panDiv.style.width = "10px";
        if (this._left) { this._panDiv.style.right = elem.style.left };

        this._isPanning = false;
        if (this._left) { this._prevX = elem.style.left };
        if (this._right) { this._prevX = elem.style.right };

        this._panDiv.addEventListener("mousedown", (e) => {
            this._prevX = e.clientX;
            this._isPanning = true;
            e.preventDefault();
        });
        window.addEventListener("mouseup", (e) => {
            this._isPanning = false;
        });
        window.addEventListener("mousemove", (e) => {
            if (!this._isPanning) { return };
            let moveRight = e.clientX > this._prevX;
            let moveLeft = e.clientX < this._prevX;
            if (moveRight) {
                this._panDiv.style.left = `${e.clientX}px`;
                let elemRect = this._elem.getBoundingClientRect();
                this._elem.style.width = `${elemRect.left - (e.clientX - this._prevX)}px`;
            }
            if (moveLeft) {
                let panRect = this._panDiv.getBoundingClientRect();
                this._panDiv.style.left = `${panRect.left - (this._prevX - e.clientX)}px`;
                let elemRect = this._elem.getBoundingClientRect();
                this._elem.style.left = `${elemRect.left + (this._prevX - e.clientX)}px`;
            }

            this._prevX = e.clientX;
        });
    }

    get panElement() {
        return this._panDiv;
    }

    get curtainElement() {
        return this._curtainDiv;
    }
}