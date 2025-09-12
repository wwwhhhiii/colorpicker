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
    label.class = "group-label";
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

    label.addEventListener("dblclick", (event) => {
        let newName = prompt("Enter new group name");
        if (newName !== null && newName != "") {
            event.target.textContent = newName;
        }
        event.stopPropagation();
    })

    return label;
}

export function createColorGroup(groupName) {
    let group = document.createElement("menu");
    group.id = groupName;
    group.name = groupName;
    group.className = "colors-group";
    group.elemsHidden = false;
    return group;
}