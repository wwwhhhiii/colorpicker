import {
    ColorPicker,
    RenamableLabel,
    DropdownMenu,
    DropMenuBtn,
} from "./utils";
// A reference to currently selected ColorElement object.
// Used to determine which ColorElement objects to display (description, image, etc.).
var _selectedColorElement = null;
// A color group registry which is used by frontend to save color groups
// and get references to CologGroup objects by their names
export var GlobColorGroups = new Map();

var _draggedColorVariant = null;
var _draggedColor = null;

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

    // set image to color view from filesystem
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

    // TODO zooming to mouse pointer is crooked but usable, need fix
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
// color variant: Color member.
// Has color input, name. Referes to one Color at a time.
// Has associated ColorView object that provides visualization for it.
class ColorVariant {
    constructor(color, variantGO, screenshotViewContainer, descrContainer) {
        this._color = color;
        this._colorView = new ColorView(variantGO.description, variantGO.img);
        this._screenshotViewContainer = screenshotViewContainer;
        this._descrContainer = descrContainer;

        let id = window.crypto.randomUUID();
        this.id = id

        this._element = document.createElement("div");
        this._element.id = id;
        this._element.className = "color-variant";
        this._drag = document.createElement("div");
        this._drag.className = "color-variant-drag";
        this._drag.draggable = true;
        this._element.appendChild(this._drag);
        this._inner = document.createElement("div");
        this._inner.className = "color-variant-inner";
        this._element.appendChild(this._inner);
        this._colorInput = new ColorPicker();
        this._colorInput.setRGBA(
            variantGO.rgb[0], variantGO.rgb[1], variantGO.rgb[2], variantGO.alpha,
        )
        this._colorInput.className = "color-picker";
        this._inner.appendChild(this._colorInput.htmlElement());
        this._removeBtn = document.createElement("button");
        this._removeBtn.textContent = "✖";
        this._inner.append(this._removeBtn);
        this._removeBtn.addEventListener('click', (e) => {
            if (window.confirm("удалить состояние?")) {
                this._color.removeColorVariant(this);
                if (this === _selectedColorElement) {
                    _selectedColorElement = null;
                }
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
        this._drag.addEventListener('dragstart', () => { _draggedColorVariant = this });
        this._drag.addEventListener('dragend', () => { _draggedColorVariant = null });
    }

    delete() {
        this._colorView.delete();
    }

    setParentColor(color) {
        if (!color instanceof Color) {
            throw new Error("provided object is not of type 'Color' type")
        }
        this._color = color;
    }

    getHtmlElement() {
        return this._element;
    }

    get colorPicker() {
        return this._colorInput;
    }

    getColorView() {
        return this._colorView;
    }

    toJSON() {
        let [r, g, b, a] = this._colorInput.getRGBA();
        return {
            rgb: [r, g, b],
            alpha: a,
            description: this._colorView.getColorTextarea().value,
            img: this._colorView.getImgFilepath(),
        }
    }
}

export class ColorGroup {
    constructor(colorGroupGO, screenshotViewContainer, descrContainer) {
        this.id = crypto.randomUUID();
        
        this._screenshotViewContainer = screenshotViewContainer;
        this._descrContainer = descrContainer;

        this._content = document.createElement("div");
        this._content.className = "color-group";
        this._inner = document.createElement("div");
        this._inner.className = "color-group-inner";

        this._renameLabel = new RenamableLabel((newName) => {
            if (newName == "default") {
                window.alert("Недопустимое имя группы");
                return false
            }
            if (GlobColorGroups.has(newName)) {
                window.alert("Имя группы занято")
                return false
            }
            return true
        });
        this._renameLabel.setName(colorGroupGO.name);
        this._renameLabel.htmlElement.className = "color-group-label";
        this._renameLabel.htmlElement.addEventListener('click', () => {
            this.folded ? this.unfold() : this.fold();
        });

        this._content.addEventListener('dragenter', (e) => { e.preventDefault() });
        this._content.addEventListener('dragover', (e) => { e.preventDefault() });
        this._content.addEventListener('drop', () => {
            if (_draggedColor === null) { return };
            try {
                this.addColor(_draggedColor);
            }
            finally {
                _draggedColor = null;
            }
        });

        this._dropMenu = new DropdownMenu();
        // rename group
        let renameBtn = new DropMenuBtn("переименовать");
        this._dropMenu.addBtn(renameBtn);
        renameBtn.htmlElement.addEventListener("click", () => {
            this._dropMenu.close();
            this._renameLabel.activateRename();
        });
        // add color
        let addColorBtn = new DropMenuBtn("добавить цвет");
        this._dropMenu.addBtn(addColorBtn);
        addColorBtn.htmlElement.addEventListener("click", () => {
            this._dropMenu.close();
            let color = new Color(
                {
                    name: "New color",
                    displayName: "New color",
                    colorspace: 0,
                    variants: [],
                },
                this._screenshotViewContainer,
                this._descrContainer,
            );
            this.unfold();
            this.addColor(color);
            color.renameableLabel.activateRename();
        });
        // remove group
        let rmGroupBtn = new DropMenuBtn("удалить");
        this._dropMenu.addBtn(rmGroupBtn);
        rmGroupBtn.htmlElement.addEventListener("click", () => {
            this._dropMenu.close();
            if (window.confirm("удалить подгруппу и все цвета?")) {
                this.delete();
            }
        });

        this._content.appendChild(this._renameLabel.htmlElement);
        this._content.appendChild(this._dropMenu.openBtnHtml);
        this._content.appendChild(this._dropMenu.menuHtml);
        this._content.appendChild(this._inner);

        this._colors = new Map();
        colorGroupGO.colors.forEach(colorGO => {
            this.addColor(
                new Color(colorGO, screenshotViewContainer, descrContainer)
            );
        });
    }

    get name() {
        return this._renameLabel.htmlElement.textContent;
    }

    get renameLabel() {
        return this._renameLabel;
    }

    get folded() { return this._inner.style.display == 'none' }

    fold() { this._inner.style.display = 'none' }
    
    unfold() { this._inner.style.display = 'block' }

    setName(s) {
        this._renameLabel.setName(s);
    }

    addColor(color) {
        if (!color instanceof Color) {
            throw new Error("wrong type provided");
        }
        this._colors.set(color.name, color);
        this._inner.appendChild(color.getHtmlElement());
    }

    removeColor(color) {
        if (!color instanceof Color) {
            throw new Error("wrong type provided");
        }
        this._colors.remove(color.name);
        this._inner.removeChild(color.getHtmlElement());
    }

    getColor(colorName) {
        return this._colors.get(colorName);
    }

    getHtmlElement() {
        return this._content;
    }

    getColors() {
        return Array.from(this._colors.values());
    }

    toJSON() {
        let colorsarr = new Array();
        for (let [_, color] of this._colors) {
            colorsarr.push(color.toJSON());
        }
        return {
            name: this._renameLabel.htmlElement.textContent,
            colors: colorsarr,
        }
    }

    delete() {
        for (let [_, color] of this._colors) {
            color.delete();
        }
        GlobColorGroups.delete(this._renameLabel.htmlElement.textContent);
        this._content.remove();
    }
}

// A convenicence object responsible for initalization and providing API for
// representing color: a set of several ColorVariants. May have 0 to N ColorVariants.
// Its name is considered to be unique. Many app's critical logic parts
// are based on Color name uniqueness, however the name uniqueness is not
// guaranteed by the input files design, so it's up to the user to provide correct files.
export class Color {
    constructor(colorGO, screenshotViewContainer, descrContainer) {
        this.id = crypto.randomUUID();

        this._screenshotViewContainer = screenshotViewContainer;
        this._descrContainer = descrContainer;

        // IMPORTANT: DO NOT ALTER THIS NAME
        this._name = colorGO.name;
        // user will edit display name, and this name should be shown to the user
        this._displayName = colorGO.displayName;
        this._colorspace = colorGO.colorspace;
        // uuid string to ColorVariant
        this._colorVariants = new Map();

        this._content = document.createElement("div");
        this._content.className = "color-content";

        this._drag = document.createElement("div");
        this._drag.className = "color-drag";
        this._drag.draggable = true;
        this._drag.addEventListener('dragstart', () => { _draggedColor = this });

        this._colorContainer = document.createElement("div");
        this._colorContainer.className = "color-container";
        this._colorContainer.style.display = "block";
        this._colorContainer.name = this._name;
        // in order for drop event to be fired
        // dragenter and dragover events should be cancelled
        this._colorContainer.addEventListener("dragenter", (e) => { e.preventDefault() });
        this._colorContainer.addEventListener("dragover", (e) => { e.preventDefault() });
        this._colorContainer.addEventListener("drop", (e) => {
            try {
                this.addColorVariant(_draggedColorVariant);
            }
            finally {
                _draggedColorVariant = null;
            };
        });

        let groupColorPicker = new ColorPicker();
        groupColorPicker.setRGBA(255, 255, 255, 1);
        groupColorPicker.getColorpickerHtml().addEventListener("input", (e) => {
            this._colorVariants.forEach((elem, k, m) => {
                elem.colorPicker.setRGBA(...groupColorPicker.getRGBA());
            });
        });
        groupColorPicker.getAlpharangeHtml().addEventListener("input", (e) => {
            this._colorVariants.forEach((elem, k, m) => {
                elem.colorPicker.getAlpharangeHtml().value = groupColorPicker._alpharange.value;
                elem.colorPicker.updateColorBg();
            });
        })

        this._renameLabel = new RenamableLabel((_) => { return true });
        this._renameLabel.htmlElement.className = "color-label";
        this._renameLabel.setName(this._displayName == "" ? this._name : this._displayName);
        this._renameLabel.htmlElement.addEventListener("click", () => {
            let cc = this._colorContainer;
            cc.style.display = cc.style.display != "none" ? "none" : "block"; 
        });
        // TODO check if label is duplicate name after rename

        this._dropMenu = new DropdownMenu();
        // change original color name
        let renameColorLabel = new RenamableLabel((name) => {
            if (window.confirm("Будет изменено оригинальное имя цвета, продолжить?")) {
                this._name = name;
                return true;
            }
            return false;
        });
        renameColorLabel.setName(this._name);
        this._dropMenu.menuHtml.appendChild(renameColorLabel.htmlElement);
        // rename color display name
        let renameBtn = new DropMenuBtn("переименовать");
        this._dropMenu.addBtn(renameBtn);
        renameBtn.htmlElement.addEventListener("click", () => {
            this._dropMenu.close();
            this._renameLabel.activateRename();
        });
        this._renameLabel.renameFieldHtml.addEventListener("change", () => {
            this._displayName = this._renameLabel.htmlElement.textContent;
        })
        // add color variant
        let addVariantBtn = new DropMenuBtn("добавить состояние");
        this._dropMenu.addBtn(addVariantBtn);
        addVariantBtn.htmlElement.addEventListener("click", () => {
            this._dropMenu.close();
            this.addColorVariant(
                new ColorVariant(
                    this,
                    {
                        description: "",
                        img: "",
                        rgb: [0, 0, 0],
                        alpha: 1,
                    },
                    this._screenshotViewContainer,
                    this._descrContainer,
                )
            );
        });
        // remove color
        let rmColorBtn = new DropMenuBtn("удалить цвет");
        this._dropMenu.addBtn(rmColorBtn);
        rmColorBtn.htmlElement.addEventListener("click", () => {
            this._dropMenu.close();
            if (window.confirm("Удалить цвет?")) {
                this.delete();
            }
        });

        this._control = document.createElement("div");
        this._control.className = "color-control";
        this._control.appendChild(this._renameLabel.htmlElement);
        this._control.appendChild(this._dropMenu.openBtnHtml);
        this._control.appendChild(this._dropMenu.menuHtml);
        this._control.appendChild(groupColorPicker.htmlElement());

        this._content.appendChild(this._drag);
        this._content.appendChild(this._control);
        this._content.appendChild(this._colorContainer);

        // load color variants
        colorGO.variants.forEach(variantGO => {
            this.addColorVariant(
                new ColorVariant(this, variantGO, screenshotViewContainer, descrContainer)
            );
        })
    }

    get name() {
        return this._name;
    }

    get renameableLabel() {
        return this._renameLabel;
    }

    delete() {
        this.clearColorElements();
        this._content.remove();
    }

    getHtmlElement() {
        return this._content;
    }

    addColorVariant(colorVariant) {
        if (!colorVariant instanceof ColorVariant) {
            throw new Error("provided object is not of 'ColorVariant' type");
        }
        if (colorVariant.id === undefined || colorVariant.id === null) {
            throw new Error(`can't add color element, element ${colorVariant} has no id`);
        }
        colorVariant.setParentColor(this);
        this._colorVariants.set(colorVariant.id, colorVariant);
        this._colorContainer.appendChild(colorVariant.getHtmlElement());
    }

    getVariants() {
        return Array.from(this._colorVariants.values());
    }

    removeColorVariant(variant) {
        if (!variant instanceof ColorVariant) {
            throw new Error("provided object is not of 'ColorVariant' type");
        }
        if (variant.id === undefined || variant.id === null) {
            throw new Error(`can't remove color element, element ${variant} has no id`);
        }
        this._colorVariants.delete(variant.id);
        this._colorContainer.removeChild(variant.getHtmlElement());
    }

    clearColorElements() {
        for (let [_, elem] of this._colorVariants) {
            elem.delete();
        }
        this._colorVariants.clear();
        this._colorContainer.replaceChildren();
    }

    // used to export to GO
    toJSON() {
        let variants = new Array();
        for (let [_, elem] of this._colorVariants) {
            variants.push(elem.toJSON());
        }
        return {
            name: this._name,
            displayName: this._displayName,
            colrspace: this._colorspace,
            variants: variants,
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

// color groups may be renamed, but their names at file load time
// remain unchanged (colorGroup._name), so global colors group map
// can be used to refer to them the same as they were not renamed
export function restoreColors(origColorGroupsGO) {
    for (let ogGroup of origColorGroupsGO) {
        for (let ogColor of ogGroup.colors) {
            let group = GlobColorGroups.get(ogGroup.name);
            if (group === undefined) { continue };
            let color = group.getColor(ogColor.name);
            if (color === undefined) { continue };
            let variants = color.getVariants();
            for (let i = 0; i < ogColor.variants.length; i++) {
                if (i < variants.length) {
                    variants[i].colorPicker.setRGBA(
                        ogColor.variants[i].rgb[0],
                        ogColor.variants[i].rgb[1],
                        ogColor.variants[i].rgb[2],
                        ogColor.variants[i].alpha,
                    )
                }
            }
        }
    }
}
