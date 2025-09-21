export function createColorElement(name, r, g, b) {
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

    return colorElement;
}

export function createColorGroupLabel(colorGroupElem) {
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

export function createColorGroup(groupName) {
    let menu = document.createElement("menu");
    menu.id = groupName;
    menu.name = groupName;
    menu.className = "colors-group-menu";
    menu.elemsHidden = false;

    let colorGroupContainer = document.createElement("div");
    colorGroupContainer.className = "color-group-container";
    let colorGroupLabel = createColorGroupLabel(menu);
    
    return [colorGroupContainer, colorGroupLabel, menu];
}