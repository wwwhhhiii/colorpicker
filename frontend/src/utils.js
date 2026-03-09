// r, g, b are Int
export function RGBToHSL(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [ Math.round(h * 360), Math.round(s * 100), Math.round(l * 100) ]
}

// h, s, l are Int
export function HSLToRGB(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ]
}

// r, g, b are Int
export function RGBToHEX(r, g, b) {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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

export class ColorPicker {
    constructor(parent) {
        this._parent = parent;

        this._r = 0;
        this._g = 0;
        this._b = 0;
        this._a = 255;

        this._wrapper = document.createElement("div");
        this._wrapper.className = "color-wrapper";
        this._wrapper.style.position = "relative";
        let bg = document.createElement("div");
        this._wrapper.appendChild(bg);
        bg.style.backgroundColor = "white";
        bg.style.position = "absolute";
        bg.style.width = "100%";
        bg.style.height = "100%";
        bg.style.zIndex = "-1";
        bg.style.boxSizing = "border-box";

        this._colorpicker = document.createElement("input");
        this._colorpicker.type = "color";
        this._colorpicker.className = "color-picker";
        this._wrapper.appendChild(this._colorpicker);

        this._alpharange = document.createElement("input");
        this._alpharange.className = "color-picker-alpha";
        this._alpharange.type = "range";
        this._alpharange.min = 0;
        this._alpharange.max = 255;
        this._alpharange.value = 255;
        this._alpharange.step = 1;
        this._wrapper.appendChild(this._alpharange);
        
        this._colorpicker.oninput = () => { this.updateColorBg() };

        this._alpharange.oninput = () => {
            this._wrapper.style.backgroundColor = this._colorpicker.value + (
                this._alpharange.value == 255 ? "" : parseInt(this._alpharange.value).toString(16).padStart(2, "0")
            );
        };
    }

    getColorpickerHtml() {
        return this._colorpicker;
    }

    getAlpharangeHtml() {
        return this._alpharange;
    }

    htmlElement() {
        return this._wrapper;
    }

    updateColorBg() {
        this._wrapper.style.backgroundColor = this._colorpicker.value + (
            this._alpharange.value == 255 ? "" : parseInt(this._alpharange.value).toString(16).padStart(2, "0")
        );
    }

    setRGBA(r, g, b, a) {
        this._colorpicker.value = RGBToHEX(r, g, b);
        this._alpharange.value = a * 255;
        this._wrapper.style.backgroundColor = this._colorpicker.value + parseInt(this._alpharange.value).toString(16).padStart(2, "0");
    }

    getRGBA() {
        let r = parseInt(`0x${this._colorpicker.value.substring(1, 3)}`, 16)
        let g = parseInt(`0x${this._colorpicker.value.substring(3, 5)}`, 16)
        let b = parseInt(`0x${this._colorpicker.value.substring(5, 7)}`, 16)
        return [r, g, b, parseFloat((this._alpharange.value / 255).toFixed(2))]
    }
}

export class RenamableLabel {
    constructor(onRename) {
        if (!onRename instanceof Function) {
            throw new Error("provide rename callback")
        }
        this._label = document.createElement("label");
        this._label.addEventListener("dblclick", () => { this.activateRename() });
        this._renameField = document.createElement("input");
        this._renameField.type = "text";
        this._renameField.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                if (this._renameField.value !== null && this._renameField != "") {
                    if (onRename(this._renameField.value) != false) {
                        this._label.textContent = this._renameField.value;
                        this._renameField.replaceWith(this._label);
                    }
                }
            }
            if (e.key == "Escape") {
                this._renameField.replaceWith(this._label);
            }
        });
        this._renameField.addEventListener("focusout", () => {
            this._renameField.replaceWith(this._label);
            this._renameField.value = "";
        });
    }

    get htmlElement() {
        return this._label;
    }

    get renameFieldHtml() {
        return this._renameField;
    }

    getHtml() {
        return this._label;
    }

    setName(name) {
        this._prevLabelContent = this._label.textContent;
        this._label.textContent = name;
    }

    activateRename() {
        this._prevLabelContent = this._label.textContent;
        this._renameField.value = this._label.textContent;
        this._label.replaceWith(this._renameField);
        this._renameField.focus();
        this._renameField.select();
    }
}

export class DropdownMenu {
    constructor() {
        this._btn = document.createElement("button");
        this._btn.className = "drop-menu-open-btn";
        this._btn.textContent = "▼";

        this._menu = document.createElement("div");
        this._menu.className = "drop-menu";

        this._menu.addEventListener("mouseleave", () => { this.close() });
        this._btn.addEventListener("click", (e) => {
            this._menu.style.display != "block" ? this.open(e.clientX, e.clientY) : this.close();
        });
    }

    open(x, y) {
        this._menu.style.left = `${x}px`;
        this._menu.style.top = `${y}px`;
        this._menu.style.display = "block";
    }

    close() {
        this._menu.style.display = "none";
    }

    get openBtnHtml() {
        return this._btn;
    }

    get menuHtml() {
        return this._menu;
    }

    get addVariantBtnHtml() {
        return this._addVariantBtn;
    }

    get delColorBtnHtml() {
        return this._delColorBtn;
    }

    addBtn(btn) {
        if (!btn instanceof DropMenuBtn) {
            throw new Error("wrong type passed");
        }
        btn._menu = this;
        this._menu.appendChild(btn.htmlElement);
        this._menu.appendChild(Object.assign(document.createElement("div"), {className: "menu-divider"}));
    }
}

export class DropMenuBtn {
    constructor(textContent) {
        this._menu = null;
        this._btn = document.createElement("button");
        this._btn.className = "drop-menu-btn";
        this._btn.textContent = textContent;
    }

    get htmlElement() {
        return this._btn;
    }
}
