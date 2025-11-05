// A reference to currently selected ColorElement object.
// Used to determine which ColorElement objects to display (description, image, etc.).
var _selectedColorElement = null;
// A color group registry which is used by frontend to save color groups
// and get references to CologGroup objects by their names
export var GlobColorGroups = new Map();

var _draggedColorObj = null;

export function getSelectedColorElement() {
    return _selectedColorElement;
}

// A convenience object responsible for storing set of elements for
// ColorElement visualization. Always bound to ColorElement and shouldn't exist by itself.
// Initializes image and description box HTML elements.
class ColorView {
    constructor(description, imgSrc) {
        this._imgContainer = document.createElement("div");
        this._imgContainer.className = "screenshot-container";
        this._imgElement = document.createElement("img");
        this._imgElement.className = "clipboard-img";
        this._imgFilepath = null;
        this.setImgSrcFS(imgSrc);
        this._imgContainer.appendChild(this._imgElement);
        this._configureImageContainer(this._imgContainer);

        this._colorTextArea = document.createElement("textarea");
        this._colorTextArea.style.resize = 'none';
        this._colorTextArea.className = "color-textarea";
        this._colorTextArea.id = window.crypto.randomUUID();
        this._colorTextArea.value = description;
    }

    delete() {
        this._imgElement.remove();
        this._imgContainer.remove();
        this._colorTextArea.remove();
    }

    getImgContainer() {
        return this._imgContainer;
    }

    getImgElement() {
        return this._imgElement;
    }

    // full path with drive
    getImgFilepath() {
        return this._imgFilepath;
    }

    getColorTextarea() {
        return this._colorTextArea;
    }

    // upload image to color view from filesystem
    setImgSrcFS(filepath) {
        if (filepath.length == 0) {
            // just empty
            this._imgFilepath = filepath;
            return;
        }
        // leverage golang's backend asset server
        // by trimming drive part from filepath
        // and getting file through asset server
        if (filepath.indexOf(":") == -1) {
            console.log(`file ${filepath} does not contain drive part`);
            window.alert("unprocessable file");
            return
        }
        this._imgElement.src = filepath.substring(
            filepath.lastIndexOf(":") + 1);
        this._imgFilepath = filepath;
    }

    setImgClipboardBlob(url) {
        this._imgElement.src = url;
        this._imgFilepath = null;
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

// A convenience object responsible for initialization and providing API for 
// "color line": ColorGroup member element.
// Has color input, name. Referes to one ColorGroup at a time.
// Has associated ColorView object that provides visualization for it.
class ColorElement {
    constructor(colorGroup, colorGO, screenshotViewContainer, descrContainer) {
        this._colorGroup = colorGroup;
        this._colorView = new ColorView(colorGO.description, colorGO.img);
        this._screenshotViewContainer = screenshotViewContainer;
        this._descrContainer = descrContainer;

        let id = window.crypto.randomUUID();
        this.id = id

        this._element = document.createElement("li");
        this._element.draggable = true;
        this._element.id = id;
        this._element.className = "color-element";
        this._colorInput = document.createElement("input");
        this._colorInput.type = "color";
        this._colorInput.className = "color-input";
        this._colorInput.value = rgbToHexStr(
            colorGO.rgb[0], colorGO.rgb[1], colorGO.rgb[2],
        )
        this._element.appendChild(this._colorInput);
        this._removeBtn = document.createElement("button");
        this._removeBtn.textContent = "✖";
        this._element.append(this._removeBtn);
        this._removeBtn.addEventListener('click', (e) => {
            if (window.confirm("remove color?")) {
                this._colorGroup.removeColorElement(this);
                this.delete();
            }
            e.stopPropagation();
        });

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
                    this._colorView.setImgClipboardBlob(URL.createObjectURL(blob));
                }
            } catch (error) {
                console.error(error);
                window.alert(error);
            }
        });
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
        this._element.addEventListener('dragstart', (e) => {
            _draggedColorObj = this;
        });
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
            img: this._colorView.getImgFilepath(),
        }
    }
}

// A convenicence object responsible for initalization and providing API for
// "color group": a set of several ColorElements. May have 0 to N ColorElements.
// Its name is considered to be unique. Many app's critical logic parts
// are based on ColorGroup name uniqueness, however the name uniqueness is not
// guaranteed by the input files design, so it's up to the user to provide correct files.
export class ColorGroup {
    constructor(colorGroupGO, screenshotViewContainer, descrContainer) {
        this._screenshotViewContainer = screenshotViewContainer;
        this._descrContainer = descrContainer;

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

        // in order for drop event to be fired
        // dragenter and dragover events should be cancelled
        this._groupMenu.addEventListener("dragenter", (e) => { e.preventDefault() });
        this._groupMenu.addEventListener("dragover", (e) => { e.preventDefault() });
        this._groupMenu.addEventListener("drop", (e) => {
            // remove color element from old group
            _draggedColorObj._colorGroup._colorElements.delete(_draggedColorObj.id);
            // add color element to new group
            this.addColorElement(_draggedColorObj);
            _draggedColorObj = null;
        });
        
        this._groupLabel = document.createElement("label");
        this._renameField = this._createRenameField(this._groupLabel);
        this._confLabel(this._groupLabel, this._groupMenu, this._renameField);
        this._groupContainer.appendChild(
            this._createDropDownBtn(
                this._groupContainer,
                this._groupLabel,
                this._renameField,
            ),
        );
        this._groupContainer.appendChild(this._groupLabel);
        this._groupContainer.appendChild(this._groupMenu);
        
        colorGroupGO.colors.forEach(colorGO => {
            this.addColorElement(
                new ColorElement(this, colorGO, screenshotViewContainer, descrContainer)
            );
        })

        // add color group to global registry
        GlobColorGroups.set(this._name, this);
    }

    delete() {
        this.clearColorElements();
        this._groupContainer.remove();
        GlobColorGroups.delete(this._name);
    }

    _createRenameField(groupLabel) {
        let renameField = document.createElement("input");
        renameField.type = "text";
        renameField.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                if (GlobColorGroups.has(renameField.value)) {
                    window.alert("Группа с таким именем уже существует");
                    return
                }
                if (renameField.value !== null && renameField != "") {
                    groupLabel.textContent = renameField.value;
                }
                renameField.replaceWith(groupLabel);
            }
            if (e.key == "Escape") {
                renameField.replaceWith(groupLabel);
            }
        })
        renameField.addEventListener("focusout", (e) => {
            renameField.replaceWith(groupLabel);
            renameField.value = "";
            // e.preventDefault();
            // e.stopPropagation();
        })
        return renameField
    }

    _createDropDownBtn(groupContainer, groupLabel, renameField) {
        let ctxBtn = document.createElement("button");
        ctxBtn.textContent = "▼";

        let dropMenu = document.createElement("div");
        dropMenu.style.position = "absolute";
        dropMenu.style.display = "none";
        dropMenu.style.width = "120px";

        // rename btn
        let renameBtn = document.createElement("button");
        renameBtn.textContent = "переименовать";
        renameBtn.style.width = "100%";
        dropMenu.appendChild(renameBtn);

        renameBtn.addEventListener("click", (evt) => {
            dropMenu.style.display = "none";
            renameField.value = groupLabel.textContent;
            groupLabel.replaceWith(renameField);
            renameField.focus();
            renameField.select();
            // evt.stopPropagation();
        })

        // add color button
        let addColorBtn = document.createElement("button");
        addColorBtn.textContent = "добавить цвет";
        addColorBtn.style.width = "100%";
        dropMenu.appendChild(addColorBtn);

        addColorBtn.addEventListener("click", (evt) => {
            dropMenu.style.display = "none";
            this.addColorElement(
                new ColorElement(
                    this,
                    {
                        description: "",
                        img: "",
                        rgb: [0, 0, 0],
                    },
                    this._screenshotViewContainer,
                    this._descrContainer,
                )
            );
            // evt.stopPropagation();
        })

        // delete group button
        let delGroupBtn = document.createElement("button");
        delGroupBtn.textContent = "удалить";
        delGroupBtn.style.width = "100%";
        dropMenu.appendChild(delGroupBtn);

        delGroupBtn.addEventListener("click", (evt) => {
            dropMenu.style.display = "none";
            if (window.confirm("удалить группу?")) {
                this.delete();
            }
        });

        groupContainer.appendChild(dropMenu);

        dropMenu.onmouseleave = (_) => {
            dropMenu.style.display = "none";
        }
        ctxBtn.addEventListener("click", (evt) => {
            dropMenu.style.display = "block";
            let brect = ctxBtn.getBoundingClientRect();
            dropMenu.style.left = `${brect.left}px`;
            dropMenu.style.top = `${brect.bottom}px`;
            // evt.stopPropagation();
        })

        return ctxBtn
    }

    _confLabel(label, menu, renameField) {
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
            // e.stopPropagation();
        }

        // rename label with doublelick
        label.ondblclick = function (e) {
            renameField.value = label.textContent;
            label.replaceWith(renameField);
            renameField.focus();
            renameField.select();
            // e.stopPropagation();
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
        elementObj._colorGroup = this;
        this._colorElements.set(elementObj.id, elementObj);
        this._groupMenu.appendChild(elementObj.getHtmlElement());
    }

    getColorElements() {
        return Array.from(this._colorElements.values());
    }

    removeColorElement(elementObj) {
        if (elementObj.id === undefined || elementObj.id === null) {
            throw new Error(`can't remove color element, element ${elementObj} has no id`)
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
            name: this._groupLabel.textContent,
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

// color groups may be renamed, but their names at file load time
// remain unchanged (colorGroup._name), so global colors group map
// can be used to refer to them the same as they were not renamed
export function restoreColors(origColorGroups) {
    origColorGroups.forEach(origGroup => {
        let cg = GlobColorGroups.get(origGroup.name);
        if (cg === null) { return };
        for (let i = 0; i <= cg.getColorElements().length - 1; i++) {
            let origColor = origGroup.colors[i];
            cg.getColorElements()[i].getColorInput().value = rgbToHexStr(
                origColor.rgb[0],
                origColor.rgb[1],
                origColor.rgb[2],
            )
        }
    })
}
