var _selectedColorElement = null;

// screenshot, description, etc.
class ColorView {
    constructor(screenshotURL) {
        this._imgContainer = document.createElement("div");
        this._imgContainer.className = "screenshot-container";
        this._imgElement = document.createElement("img");
        this._imgElement.className = "clipboard-img";
        this._imgElement.src = screenshotURL;

        this._imgContainer.appendChild(this._imgElement);
        this._configureImageContainer(this._imgContainer);
    }

    getImgContainer() {
        return this._imgContainer;
    }

    updateImgSrc(newSrc) {
        this._imgElement.src = newSrc;
    }

    _configureImageContainer(containerElem) {
            containerElem._scale = 1;
        containerElem._isPanning = false;
        containerElem._ptX = 0;
        containerElem._ptY = 0;
        containerElem._start = {x: 0, y: 0};

        let stopPanning = function(e) {
            containerElem._isPanning = false;
            containerElem.style.cursor = "default";
        };
        containerElem.onmousedown = function(e) {
            e.preventDefault();
            containerElem._start.x = e.clientX - containerElem._ptX;
            containerElem._start.y = e.clientY - containerElem._ptY;
            containerElem._isPanning = true;
            containerElem.style.cursor = "grab";
        };
        containerElem.onmouseup = stopPanning;
        containerElem.onmouseleave = stopPanning;
        containerElem.onmousemove = function(e) {
            e.preventDefault();
            if (!containerElem._isPanning) {
                return;
            }
            containerElem._ptX = e.clientX - containerElem._start.x;
            containerElem._ptY = e.clientY - containerElem._start.y;
            containerElem.style.transform = `translate(${containerElem._ptX}px, ${containerElem._ptY}px) scale(${containerElem._scale})`;
        };
        containerElem.onwheel = function(e) {
            e.preventDefault();
            if (containerElem._isPanning) {
                return;
            }
            let x = (e.clientX - containerElem._ptX) / containerElem._scale;
            let y = (e.clientY - containerElem._ptY) / containerElem._scale;
            let delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
            (delta > 0) ? (containerElem._scale *= 1.1) : (containerElem._scale /= 1.1);
            containerElem._ptX = e.clientX - x * containerElem._scale;
            containerElem._ptY = e.clientY - y * containerElem._scale;
            containerElem.style.transform = `translate(${containerElem._ptX}px, ${containerElem._ptY}px) scale(${containerElem._scale})`;
        };

        return containerElem;
    }
}

// color element, i.e. color line
function createColorElement(name, screenshotViewContainer, r, g, b) {
    let colorElement = document.createElement("li");
    colorElement.className = "color-element";
    colorElement.textContent = name;

    let colorInput = document.createElement("input");
    colorInput.type = "color";
    let rhex = r.toString(16).padStart(2, '0');
    let ghex = g.toString(16).padStart(2, '0');
    let bhex = b.toString(16).padStart(2, '0');
    colorInput.value = `#${rhex}${ghex}${bhex}`;
    colorElement.appendChild(colorInput);

    colorElement.addEventListener("dblclick", (event) => {
        window.alert(`you clicked ${event.target.textContent}`);
    });

    // each color in a color group has its own description
    let colorTextarea = document.createElement("textarea");
    colorTextarea.style.resize = 'none';
    colorTextarea.className = "__replacable-color-desc";
    colorElement.colorDescription = colorTextarea;
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
                let screenshotURL = URL.createObjectURL(blob);
                if (colorElement.colorView === null) {
                    colorElement.colorView = new ColorView(screenshotURL);
                    screenshotViewContainer.appendChild(colorElement.colorView.getImgContainer());
                } else {
                    colorElement.colorView.updateImgSrc(screenshotURL);
                }
            }
        } catch (error) {
            console.log(error);
            window.alert(error);
        }
    };

    colorElement.onclick = function (e) {
        if (_selectedColorElement !== null) {
            _selectedColorElement.style.backgroundColor = '';
        }
        let clickedColorElement = colorElement;

        if (_selectedColorElement !== null) {
            if (_selectedColorElement.colorView !== null) {
                screenshotViewContainer.removeChild(_selectedColorElement.colorView.getImgContainer());
            }
            if (clickedColorElement.colorView !== null) {
                screenshotViewContainer.appendChild(clickedColorElement.colorView.getImgContainer());
            }
        }
        _selectedColorElement = clickedColorElement;
        _selectedColorElement.style.backgroundColor = '#f003fc';
        let oldDesc = document.getElementsByClassName("__replacable-color-desc")[0];
        oldDesc.replaceWith(clickedColorElement.colorDescription);
    };

    return colorElement;
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

export function createColorGroup(group, screenshotViewContainer) {
    let menu = document.createElement("menu");
    menu.id = group.name;  // TODO should be unique
    menu.name = group.name;
    menu.className = "colors-group-menu";
    menu.elemsHidden = false;

    let colorGroupContainer = document.createElement("div");
    colorGroupContainer.className = "color-group-container";
    colorGroupContainer.id = window.crypto.randomUUID();
    let colorGroupLabel = createColorGroupLabel(menu);

    group.colors.forEach(color => {
        menu.appendChild(createColorElement(
            "test color name",
            screenshotViewContainer,
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