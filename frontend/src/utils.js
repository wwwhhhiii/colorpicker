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

export class ColorPicker {
    constructor() {
        // container for colorpicker
        this._colorpicker = document.createElement("div");
        this._colorpicker.className = "color-picker";
        
        // preview
        this._preview = document.createElement("div");
        this._preview.className = "preview";
        this._colorpicker.appendChild(this._preview);
        this._previewInner = document.createElement("div");
        this._previewInner.className = "preview-inner";
        this._preview.appendChild(this._previewInner);

        // controls
        this._controls = document.createElement("div");
        this._colorpicker.appendChild(this._controls);
        this._controls.className = "controls";

        let fmtSelector = document.createElement("div");
        fmtSelector.className = "format-selector";
        this._controls.appendChild(fmtSelector);

        this._formatSelect = document.createElement("select");
        fmtSelector.appendChild(this._formatSelect);
        let rgba = document.createElement("option");
        rgba.value = "rgba"; rgba.textContent = "RGBA";
        this._formatSelect.appendChild(rgba);
        let hsla = document.createElement("option");
        hsla.value = "hsla"; hsla.textContent = "HSLA";
        this._formatSelect.appendChild(hsla);
        let hex = document.createElement("option");
        hex.value = "hex"; hex.textContent = "HEX";
        this._formatSelect.appendChild(hex);

        // sliders
        this._sliders = document.createElement("div");
        this._sliders.className = "sliders";
        this._controls.appendChild(this._sliders);

        this._slidersArr = new Array();

        // Red RGBA slider
        let sliderGR = document.createElement("div");
        sliderGR.className = "slider-group";
        sliderGR.dataset.format = "rgba";
        this._slidersArr.push(sliderGR);
        this._sliders.appendChild(sliderGR);
        let chanLabelR = document.createElement("span");
        chanLabelR.className = "channel-label";
        chanLabelR.textContent = "R";
        sliderGR.appendChild(chanLabelR);
        this._rSlider = document.createElement("input");
        this._rSlider.type = "range";
        this._rSlider.min = 0; this._rSlider.max = 255; this._rSlider.value = 255;
        sliderGR.append(this._rSlider);

        // Green RGBA slider
        let sliderGG = document.createElement("div");
        sliderGG.className = "slider-group";
        sliderGG.dataset.format = "rgba";
        this._slidersArr.push(sliderGG);
        this._sliders.appendChild(sliderGG);
        let chanLabelG = document.createElement("span");
        chanLabelG.className = "channel-label";
        chanLabelG.textContent = "G";
        sliderGG.appendChild(chanLabelG);
        this._gSlider = document.createElement("input");
        this._gSlider.type = "range";
        this._gSlider.min = 0; this._gSlider.max = 255; this._gSlider.value = 0;
        sliderGG.append(this._gSlider);

        // Blue RGBA slider
        let sliderGB = document.createElement("div");
        sliderGB.className = "slider-group";
        sliderGB.dataset.format = "rgba";
        this._slidersArr.push(sliderGB);
        this._sliders.appendChild(sliderGB);
        let chanLabelB = document.createElement("span");
        chanLabelB.className = "channel-label";
        chanLabelB.textContent = "B";
        sliderGB.appendChild(chanLabelB);
        this._bSlider = document.createElement("input");
        this._bSlider.type = "range";
        this._bSlider.min = 0; this._bSlider.max = 255; this._bSlider.value = 0;
        sliderGB.append(this._bSlider);

        // Alpha RGBA slider
        let sliderGA = document.createElement("div");
        sliderGA.className = "slider-group";
        sliderGA.dataset.format = "rgba hsla";
        this._slidersArr.push(sliderGA);
        this._sliders.appendChild(sliderGA);
        let chanLabelA = document.createElement("span");
        chanLabelA.className = "channel-label";
        chanLabelA.textContent = "A";
        sliderGA.appendChild(chanLabelA);
        this._aSlider = document.createElement("input");
        this._aSlider.type = "range";
        this._aSlider.min = 0; this._aSlider.max = 100; this._aSlider.value = 100;
        sliderGA.append(this._aSlider);

        // hsl H slider
        let sliderH = document.createElement("div");
        sliderH.className = "slider-group";
        sliderH.dataset.format = "hsla";
        sliderH.style.display = "none";
        this._slidersArr.push(sliderH);
        this._sliders.appendChild(sliderH);
        let chanLabelH = document.createElement("span");
        chanLabelH.className = "channel-label";
        chanLabelH.textContent = "H";
        sliderH.appendChild(chanLabelH);
        this._hSlider = document.createElement("input");
        this._hSlider.type = "range";
        this._hSlider.min = 0; this._hSlider.max = 360; this._hSlider.value = 0;
        sliderH.append(this._hSlider);

        // hsl S slider
        let sliderS = document.createElement("div");
        sliderS.className = "slider-group";
        sliderS.dataset.format = "hsla";
        sliderS.style.display = "none";
        this._slidersArr.push(sliderS);
        this._sliders.appendChild(sliderS);
        let chanLabelS = document.createElement("span");
        chanLabelS.className = "channel-label";
        chanLabelS.textContent = "S";
        sliderS.appendChild(chanLabelS);
        this._sSlider = document.createElement("input");
        this._sSlider.type = "range";
        this._sSlider.min = 0; this._sSlider.max = 100; this._sSlider.value = 100;
        sliderS.append(this._sSlider);

        // hsl L slider
        let sliderL = document.createElement("div");
        sliderL.className = "slider-group";
        sliderL.style.display = "none";
        sliderL.dataset.format = "hsla";
        this._slidersArr.push(sliderL);
        this._sliders.appendChild(sliderL);
        let chanLabelL = document.createElement("span");
        chanLabelL.className = "channel-label";
        chanLabelL.textContent = "L";
        sliderL.appendChild(chanLabelL);
        this._lSlider = document.createElement("input");
        this._lSlider.type = "range";
        this._lSlider.min = 0; this._lSlider.max = 100; this._lSlider.value = 50;
        sliderL.append(this._lSlider);

        this._colorOutput = document.createElement("input");
        this._colorOutput.type = "text";
        this._colorOutput.readOnly = true;
        this._controls.appendChild(this._colorOutput);

        // logic
        this._currentColor = {
            r: 255,
            g: 0,
            b: 0,
            a: 100,
            h: 0,
            s: 100,
            l: 50
        };
        // TODO escape does not work
        this._preview.addEventListener("keydown", (e) => {
            if (e.key == "Escape") {
                this._controls.classList.toggle("visible");
            }
        });
        this._preview.addEventListener('click', (e) => {
            this._controls.classList.toggle('visible');
            e.stopPropagation();
        });
        this._controls.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
        })
        this._formatSelect.addEventListener('change', (e) => {
            this._updateFormat();
            e.stopPropagation();
        });
        this._initSliders();
        this._updateColor();
    }

    // currently selected alpha value
    get alpha() {
        return this._currentColor.a;
    }

    // currently selected red value
    get red() {
        return this._currentColor.r;
    }

    // currently selected green value
    get green() {
        return this._currentColor.g;
    }

    // currently selected blue value
    get blue() {
        return this._currentColor.b;
    }

    setRGBA(r, g, b, a) {
        const cc = this._currentColor;
        [cc.r, cc.g, cc.b, cc.a] = [r, g, b, a];
        [
            this._rSlider.value,
            this._gSlider.value,
            this._bSlider.value,
            this._aSlider.value,
        ] = [r, g, b, a * 100];
        this._syncHSLwRGB();
        this._updateColor();
    }

    htmlElement() {
        return this._colorpicker;
    }

    _updateFormat() {
        const format = this._formatSelect.value;
        
        this._slidersArr.forEach(slider => {
            const formats = slider.dataset.format.split(' ');
            slider.style.display = formats.includes(format) ? 'flex' : 'none';
        });
        
        this._updateColor();
    }

    _updateColor() {
        const cc = this._currentColor;

        const fmtVal = this._formatSelect.value;
        let colorString;
        
        if (fmtVal === 'rgba') {
            colorString = `rgba(${cc.r}, ${cc.g}, ${cc.b}, ${cc.a.toFixed(2)})`;
        } else if (fmtVal === 'hsla') {
            colorString = `hsla(${cc.h}, ${cc.s}%, ${cc.l}%, ${cc.a.toFixed(2)})`;
        } else if (fmtVal === 'hex') {
            const hex = RGBToHEX(cc.r, cc.g, cc.b);
            colorString = cc.a < 1 ? 
                hex + Math.round(cc.a * 255).toString(16).padStart(2, '0') : 
                hex;
        }
        
        this._previewInner.style.backgroundColor = fmtVal === 'hex' ? `#${RGBToHEX(cc.r, cc.g, cc.b)}` : colorString;
        
        this._colorOutput.value = colorString;
    }

    // syncs HSL colors with current RGB values
    _syncHSLwRGB() {
        const cc = this._currentColor;
        [cc.h, cc.s, cc.l] = RGBToHSL(cc.r, cc.g, cc.b);
        [this._hSlider.value, this._sSlider.value, this._lSlider.value] = [cc.h, cc.s, cc.l];
    }

    // syncs RGB colors with current HSL values
    _syncRGBwHSL() {
        const cc = this._currentColor;
        [cc.r, cc.g, cc.b] = HSLToRGB(cc.h, cc.s, cc.l);
        [this._rSlider.value, this._gSlider.value, this._bSlider.value] = [cc.r, cc.g, cc.b];
    }

    _initSliders() {
        const cc = this._currentColor;
        
        // RGBA
        this._rSlider.addEventListener("input", () => {
            cc.r = this._rSlider.valueAsNumber;
            this._updateColor();
        });
        this._rSlider.addEventListener("change", () => { this._syncHSLwRGB() });

        this._gSlider.addEventListener("input", () => {
            cc.g = this._gSlider.valueAsNumber;
            this._updateColor();
        });
        this._gSlider.addEventListener("change", () => { this._syncHSLwRGB() });

        this._bSlider.addEventListener("input", () => {
            cc.b = this._bSlider.valueAsNumber;
            this._updateColor();
        });
        this._bSlider.addEventListener("change", () => { this._syncHSLwRGB() });

        // alpha
        this._aSlider.addEventListener("input", () => {
            cc.a = this._aSlider.valueAsNumber / 100;
            this._updateColor();
        });

        // HSLA
        this._hSlider.addEventListener("input", () => {
            cc.h = this._hSlider.valueAsNumber;
            this._updateColor();
        });
        this._hSlider.addEventListener("change", () => { this._syncRGBwHSL() });

        this._sSlider.addEventListener("input", () => {
            cc.s = this._sSlider.valueAsNumber;
            this._updateColor();
        });
        this._sSlider.addEventListener("change", () => { this._syncRGBwHSL() });

        this._lSlider.addEventListener("input", () => {
            cc.l = this._lSlider.valueAsNumber;
            this._updateColor();
        });
        this._lSlider.addEventListener("change", () => { this._syncRGBwHSL() });
    }
}
