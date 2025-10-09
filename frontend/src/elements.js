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

// color element, i.e. color line
function createColorElement(name, screenshotViewContainer, descContainer, r, g, b) {
    let colorElement = document.createElement("li");
    colorElement.className = "color-element";
    colorElement.textContent = name;

    let colorInput = document.createElement("input");
    colorInput.className = "color-input";
    colorInput.type = "color";
    let rhex = r.toString(16).padStart(2, '0');
    let ghex = g.toString(16).padStart(2, '0');
    let bhex = b.toString(16).padStart(2, '0');
    colorInput.value = `#${rhex}${ghex}${bhex}`;
    colorElement.appendChild(colorInput);

    colorElement.addEventListener("dblclick", (event) => {
        window.alert(`you clicked ${event.target.textContent}`);
    });

    // each сolor element has colorView,
    // a struct containing logic for manipulation of a screenshot and its description
    colorElement.colorView = null;

    colorElement.onpaste = async function () {
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
                colorElement.colorView.setImgSrc(URL.createObjectURL(blob));
            }
        } catch (error) {
            console.log(error);
            window.alert(error);
        }
    };
    colorElement.onclick = function (e) {
        if (colorElement.colorView === null) {
            colorElement.colorView = new ColorView();
        }
        if (_selectedColorElement !== null) {
            _selectedColorElement.style.backgroundColor = '';
            screenshotViewContainer.removeChild(_selectedColorElement.colorView.getImgContainer());
            descContainer.removeChild(_selectedColorElement.colorView.getColorTextarea());
        }
        screenshotViewContainer.appendChild(colorElement.colorView.getImgContainer());
        descContainer.appendChild(colorElement.colorView.getColorTextarea());

        _selectedColorElement = colorElement;
        _selectedColorElement.style.backgroundColor = '#f003fc';
    };

    return colorElement;
}

function colorElementToJson(colorElement) {
    let colorInput = colorElement.querySelector(".color-input");
    let r = parseInt(colorInput.value.substr(1, 2), 16);
    let g = parseInt(colorInput.value.substr(3, 2), 16);
    let b = parseInt(colorInput.value.substr(5, 2), 16);
    return {
        rgb: [r, g, b],
        alpha: 1,  // TODO change when available
    }
}

// expects color group menu
export function colorGroupToJson(colorGroup) {
    return {
        name: colorGroup.name,
        colorspace: 0, // TODO change when available, and mb change parsing based on colorspace
        colors: Array.from(colorGroup.querySelectorAll(".color-element")).map(
            (color) => colorElementToJson(color)
        ),
    }
}

function createColorGroupLabel(colorGroupElem) {
    let label = document.createElement("label");
    label.classNme = "color-group-label";
    label.for = colorGroupElem.id;
    label.htmlFor = colorGroupElem.id;
    label.textContent = colorGroupElem.name;

    // fold/unfold child elements with double click
    label.addEventListener("click", (event) => {
        let labelColorGroup = document.getElementById(event.target.htmlFor);
        let groupColors = labelColorGroup.getElementsByClassName("color-element");
        for (let color of groupColors) {
            color.style.display = labelColorGroup.elemsHidden ? 'block' : 'none';
        }
        labelColorGroup.elemsHidden = !labelColorGroup.elemsHidden;
        event.stopPropagation();
    });

    let renameField = document.createElement("input");
    renameField.type = "text";

    // rename label with doublelick
    label.addEventListener("dblclick", (event) => {
        renameField.value = label.textContent;
        label.replaceWith(renameField);
        renameField.focus();
        renameField.select();

        event.stopPropagation();
    });
    renameField.addEventListener("keydown", (event) => {
        if (event.key == "Enter") {
            if (renameField.value !== null && renameField != "") {
                label.textContent = renameField.value;
            }
            renameField.replaceWith(label);
            event.preventDefault();
        }
        if (event.key == "Escape") {
            renameField.replaceWith(label);
            event.preventDefault();
        }
    });

    return label;
}

export function createColorGroup(group, screenshotViewContainer, descContainer) {
    let menu = document.createElement("menu");
    menu.id = group.name;  // TODO should be unique
    menu.name = group.name;
    menu.className = "colors-group-menu";
    menu.elemsHidden = false;

    let colorGroupContainer = document.createElement("div");
    colorGroupContainer.className = "color-group-container";
    colorGroupContainer.id = window.crypto.randomUUID();
    colorGroupContainer.colors = group.colors;
    let colorGroupLabel = createColorGroupLabel(menu);

    group.colors.forEach(color => {
        menu.appendChild(createColorElement(
            "test color name",
            screenshotViewContainer,
            descContainer,
            color.rgb[0],
            color.rgb[1],
            color.rgb[2],
        ));
    });

    colorGroupContainer.appendChild(colorGroupLabel);
    colorGroupContainer.appendChild(menu);
    
    return {
        containerElem: colorGroupContainer,
        labelElem: colorGroupLabel,
        menuElem: menu,
    }
}