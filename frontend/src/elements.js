var _selectedColorElement = null;

// screenshot, description, etc.
class ColorView {
    constructor() {
        this._imgContainer = document.createElement("div");
        this._imgContainer.className = "screenshot-container";
        this._imgElement = document.createElement("img");
        this._imgElement.className = "clipboard-img";
        this._imgElement.src = "";
        this._imgContainer.appendChild(this._imgElement);
        this._configureImageContainer(this._imgContainer);

        this._colorTextArea = document.createElement("textarea");
        this._colorTextArea.style.resize = 'none';
        this._colorTextArea.className = "color-textarea";
        this._colorTextArea.id = window.crypto.randomUUID();
    }

    delete() {
        this._imgElement.remove();
        this._imgContainer.remove();
        this._colorTextArea.remove();
    }

    getImgContainer() {
        return this._imgContainer;
    }

    getColorTextarea() {
        return this._colorTextArea;
    }

    setImgSrc(newSrc) {
        this._imgElement.src = newSrc;
    }

    _configureImageContainer(containerElem) {
        let scale = 1;
        let scaleFactor = 1.1;
        let isPanning = false;
        let mousedownX = 0;
        let mousedownY = 0;
        let translateX = 0;
        let translateY = 0;

        let stopPanning = function(e) {
            isPanning = false;
            containerElem.style.cursor = "default";
        };
        containerElem.onmousedown = function(e) {
            e.preventDefault();
            mousedownX = e.clientX - translateX;
            mousedownY = e.clientY - translateY;
            isPanning = true;
            containerElem.style.cursor = "grab";
        };
        containerElem.onmouseup = stopPanning;
        containerElem.onmouseleave = stopPanning;
        containerElem.onmousemove = function(e) {
            e.preventDefault();
            if (!isPanning) {
                return;
            }
            translateX = e.clientX - mousedownX;
            translateY = e.clientY - mousedownY;
            containerElem.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };
        containerElem.onwheel = function(e) {
            e.preventDefault();
            if (isPanning) {
                return;
            }
            let xs = (e.clientX - translateX) / scale;
            let ys = (e.clientY - translateY) / scale;
            let delta = e.wheelDelta ? e.wheelDelta : -e.deltaY;
            let newScale = (delta > 0) ? (scale * scaleFactor) : (scale / scaleFactor);
            if (newScale >= 0.5 && newScale <= 50) {
                scale = newScale;
                translateX = e.clientX - xs * scale;
                translateY = e.clientY - ys * scale;
                containerElem.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
            }
        };

        return containerElem;
    }
}

class ColorElement {
    constructor(colorGO, screenshotViewContainer, descrContainer) {
        this._colorView = new ColorView();
        this._screenshotViewContainer = screenshotViewContainer;
        this._descrContainer = descrContainer;

        let id = window.crypto.randomUUID();
        this.id = id

        this._element = document.createElement("li");
        this._element.id = id;
        this._element.className = "color-element";
        this._element.textContent = "test"; // TODO
        this._colorInput = document.createElement("input");
        this._colorInput.type = "color";
        this._colorInput.className = "color-input";
        this._colorInput.value = rgbToHexStr(
            colorGO.rgb[0], colorGO.rgb[1], colorGO.rgb[2],
        )
        this._element.appendChild(this._colorInput);
        this._element.addEventListener('dblclick', () => {
            window.alert(`you clicked ${e.target.textContent}`);
        })
        this._element.addEventListener('paste', async () => {
            if (_selectedColorElement === null) {
                window.alert("select color line before paste");
                return;
            }
            try {
                let clipboardContent = await navigator.clipboard.read();
                for (let item of clipboardContent) {
                    if (!item.types.includes("image/png")) {
                        throw new Error("clipboard does not contain image");
                    }
                    let blob = await item.getType("image/png");
                    this._colorView.setImgSrc(URL.createObjectURL(blob));
                }
            } catch (error) {
                console.error(error);
                window.alert(error);
            }
        })
        this._element.addEventListener('click', () => {
            if (_selectedColorElement !== null) {
                _selectedColorElement._element.style.backgroundColor = '';
                screenshotViewContainer.removeChild(
                    _selectedColorElement._colorView.getImgContainer());
                    descrContainer.removeChild(_selectedColorElement._colorView.getColorTextarea());
            }
            screenshotViewContainer.appendChild(this._colorView.getImgContainer());
            descrContainer.appendChild(this._colorView.getColorTextarea());
    
            _selectedColorElement = this;
            _selectedColorElement._element.style.backgroundColor = '#f003fc';
        })
    }

    delete() {
        this._colorView.delete();
    }

    getHtmlElement() {
        return this._element;
    }

    getColorInput() {
        return this._colorInput;
    }

    getColorView() {
        return this._colorView;
    }

    toJSON() {
        let res = hexStrToRGB(this._colorInput.value)
        return {
            rgb: [res.r, res.g, res.b],
            alpha: 1,  // TODO change it
            description: this._colorView.getColorTextarea().value,
        }
    }
}

export class ColorGroup {
    constructor(colorGroupGO, screenshotViewContainer, descrContainer) {
        this._name = colorGroupGO.name;
        // uuid string to ColorElement
        this._colorElements = new Map();

        this._groupContainer = document.createElement("div");
        this._groupContainer.className = "color-group-container";
        this._groupContainer.name =  this._name;

        this._groupMenu = document.createElement("menu");
        this._groupMenu.id =  this._name;
        this._groupMenu.name =  this._name;
        this._groupMenu.className = "colors-group-menu";
        this._groupMenu.elemsHidden = false;

        this._groupLabel = this._createLabel(this._groupMenu);
        this._groupContainer.appendChild(this._groupLabel);
        this._groupContainer.appendChild(this._groupMenu);

        colorGroupGO.colors.forEach(colorGO => {
            this.addColorElement(
                new ColorElement(colorGO, screenshotViewContainer, descrContainer));
        })
    }

    delete() {
        this.clearColorElements();
        this._groupContainer.remove();
    }

    _createLabel(menu) {
        let label = document.createElement("label");
        label.className = "color-group-label";
        label.for = menu.id;
        label.htmlFor = menu.id;
        label.textContent = menu.name;

        // fold/unfold child elements with double click
        label.onclick = function (e) {
            for (let color of menu.getElementsByClassName("color-element")) {
                color.style.display = menu.elemsHidden ? 'block' : 'none';
            }
            menu.elemsHidden = !menu.elemsHidden;
            e.stopPropagation();
        }

        let renameField = document.createElement("input");
        renameField.type = "text";
        // rename label with doublelick
        label.ondblclick = function (e) {
            renameField.value = label.textContent;
            label.replaceWith(renameField);
            renameField.focus();
            renameField.select();
            e.stopPropagation();
        }
        renameField.onkeydown = function (e) {
            if (e.key == "Enter") {
                if (renameField.value !== null && renameField != "") {
                    label.textContent = renameField.value;
                }
                renameField.replaceWith(label);
                e.preventDefault();
            }
            if (e.key == "Escape") {
                renameField.replaceWith(label);
                e.preventDefault();
            }
        }

        return label
    }

    getHtmlElement() {
        return this._groupContainer;
    }

    addColorElement(elementObj) {
        if (elementObj.id === undefined || elementObj.id === null) {
            throw new Error(`can't add color element, element ${elementObj} has no id`)
        }
        this._colorElements.set(elementObj.id, elementObj);
        this._groupMenu.appendChild(elementObj.getHtmlElement());
    }

    removeColorElement(elementObj) {
        if (elementObj.id === undefined || elementObj.id === null) {
            throw new Error(`can't add color element, element ${elementObj} has no id`)
        }
        this._colorElements.delete(elementObj.id);
        this._groupMenu.removeChild(elementObj.getHtmlElement());
    }

    clearColorElements() {
        for (let [_, elem] of this._colorElements) {
            elem.delete();
        }
        this._colorElements.clear();
        this._groupMenu.replaceChildren();
    }

    toJSON() {
        let elemsarr = new Array();
        for (let [_, elem] of this._colorElements) {
            elemsarr.push(elem.toJSON());
        }
        return {
            name: this._name,
            colrspace: 0,  // TODO change it
            colors: elemsarr,
        }
    }
}

// clear all references to all previously loaded elements
export function onDocsReload() {
    _selectedColorElement = null;
}

export function onFileReload() {
    _selectedColorElement = null;
}

function rgbToHexStr(r, g, b) {
    let rhex = r.toString(16).padStart(2, '0');
    let ghex = g.toString(16).padStart(2, '0');
    let bhex = b.toString(16).padStart(2, '0');
    return `#${rhex}${ghex}${bhex}`
}

function hexStrToRGB(hexstr) {
    return {
        r: parseInt(hexstr.substr(1, 2), 16),
        g: parseInt(hexstr.substr(3, 2), 16),
        b: parseInt(hexstr.substr(5, 2), 16),
    }
}

// TODO broken
export function restoreColors(colorsGroupContainer, origColorGroups) {
    origColorGroups.forEach(origGroup => {
        let cg = colorsGroupContainer.colorsGroupMap.get(origGroup.name);
        if (cg === null) { return };
        for (let i = 0; i < origGroup.colors.length; i++) {
            let origColor = origGroup.colors[i];
            cg.__colorElems[i].__colorInput.value = rgbToHexStr(
                origColor.rgb[0],
                origColor.rgb[1],
                origColor.rgb[2],
            )
        }
    })
}
