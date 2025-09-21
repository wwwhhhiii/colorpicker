var _selectedColorElement = null;

// color element, i.e. color line
function createColorElement(name, imagePlaceholderElem, r, g, b) {
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
    colorElement.colorScreenshotURL = null;

    async function pasteImage() {
        console.log("paste triggered");
        if (_selectedColorElement === null) {
            window.alert("select a color line before paste");
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
                imagePlaceholderElem.src = screenshotURL;
                _selectedColorElement.colorScreenshotURL = screenshotURL;
            }
        } catch (error) {
            console.log(error);
            window.alert(error);
        }
    };

    colorElement.addEventListener("paste", pasteImage);

    colorElement.addEventListener("click", (event) => {
        if (_selectedColorElement !== null) {
            console.log("setting previous color elemnent bg color to none");
            _selectedColorElement.style.backgroundColor = '';
            imagePlaceholderElem.src = "";
        }
        _selectedColorElement = colorElement;
        _selectedColorElement.style.backgroundColor = '#f003fc';
        let oldDesc = document.getElementsByClassName("__replacable-color-desc")[0];
        oldDesc.replaceWith(colorElement.colorDescription);
        if (_selectedColorElement.colorScreenshotURL !== null) {
            imagePlaceholderElem.src = _selectedColorElement.colorScreenshotURL;
        };
    });

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

export function createColorGroup(group, imagePlaceholderElem) {
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
            imagePlaceholderElem,
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