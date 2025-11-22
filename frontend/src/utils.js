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

export class Btn {
    constructor(onpressedFunc, txt) {
        this._html = document.createElement("btn");
        this._html.className = "generic-btn";
        this._html.textContent = txt;

        this._pressfunc = onpressedFunc;
    }
}

export class Dialog {
    constructor(txt, btn1, btn2, w = 150, h = 100) {
        this._btn1 = btn1;
        this._btn2 = btn2;
        this._label = document.createElement("label");
        this._label.textContent = txt;
        this._btnDiv = document.createElement("div");
        
        this._html = document.createElement("div");
        this._html.className = "genecric-dialog";
        
        this._html.appendChild(this._label);
        this._btnDiv.appendChild(this._btn1._html);
        this._btnDiv.appendChild(this._btn2._html);
        this._html.appendChild(this._btnDiv);

        this._html.style.display = "none";
        this._html.style.width = w + "px";
        this._html.style.height = h + "px";
        this._html.style.top = ((window.innerHeight/2) - (this._html.offsetHeight/2)) + 'px';
        this._html.style.left = ((window.innerWidth/2) - (this._html.offsetWidth/2)) + 'px';
        this._html.style.position = "absolute";
        this._html.style.backgroundColor = "grey";

        this._btn1._html.onclick = () => {
            this._btn1._pressfunc();
            this.Destroy();
        }
        this._btn2._html.onclick = () => {
            this._btn2._pressfunc();
            this.Destroy();
        }
    }

    Show() {
        this._html.style.display = "block";
    }

    Hide() {
        this._html.style.display = "none";
    }

    Destroy() {
        this._html.parentNode.removeChild(this._html);
    }
}
