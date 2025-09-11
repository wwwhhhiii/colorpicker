import './style.css';

import {LoadColorsFile, OpenFileDialog} from "../wailsjs/go/main/App";

const APP_SOURCE_HTML = 'test.html';
const APP_SOURCE_CSS = 'style.css';

let appElement = document.querySelector('#app');

window.reloadDynDocs = async function() {
    await fetch(APP_SOURCE_HTML)
    .then(response => async function () {
        if (!response.ok) {
            throw new Error(await response.text());
        }
        return response.text();
    }())
    .then(htmlContent => async function () {
        // inject .html
        appElement.innerHTML = htmlContent;
        // inject .css
        await fetch(APP_SOURCE_CSS)
        .then(response => async function () {
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return response.text();
        }())
        .then(cssContent => {
            let dynamicStyle = document.getElementById("_dynamic-style");
            if (dynamicStyle !== null) {
                dynamicStyle.parentNode.removeChild(dynamicStyle);
            }
            let style = document.createElement("style");
            style.id = "_dynamic-style";
            style.type = "text/css";
            style.textContent = cssContent;
            document.head.appendChild(style);
        })
        .catch(error => {
            console.error("error fetching CSS:", error);
            appElement.innerHTML = `<p>Load ${APP_SOURCE_CSS} <strong>(${error})</strong></p>`;
        })
    }())
    .catch(error => {
        console.error("error fetching HTML:", error);
        appElement.innerHTML = `<p>Load ${APP_SOURCE_HTML} <strong>(${error})</strong></p>`;
    });
};

function createColorElement(name) {
    let colorElement = document.createElement("li");
    colorElement.className = "color-element";
    colorElement.textContent = name;
    let colorInput = document.createElement("input");
    colorInput.type = "color";
    colorElement.appendChild(colorInput);
    colorElement.addEventListener("dblclick", (event) => {
        window.alert(`you clicked ${name} element`);
    });
    return colorElement;
}

window.openFileDialog = function () {
    try {
        LoadColorsFile()
            .then((result) => {
                let colorsMenu = document.getElementById("colors-groups-menu");
                result.forEach(element => {
                    colorsMenu.appendChild(createColorElement(element));
                });
            })
            .catch((err) => {
                console.error(err);
                throw new Erorr("error:", err)
            });
    } catch (err) {
        console.error(err);
    }
};

function createColorGroup() {
    let group = document.createElement("menu");
    group.className = "colors-group";
    group.textContent = "Подгруппа";
    group.elemsHidden = false;

    // TODO remove test elements
    group.appendChild(createColorElement("test_1"));
    group.appendChild(createColorElement("test_2"));

    // fold/unfold child elements with double click
    group.addEventListener("dblclick", (event) => {
        let groupColors = event.target.getElementsByClassName("color-element");
        for (let color of groupColors) {
            color.style.display = event.target.elemsHidden ? 'block' : 'none';
        }
        event.target.elemsHidden = !event.target.elemsHidden;
        event.stopPropagation();
        window.alert("clicked");
    });
    return group;
}

window.addColorGroup = function () {
    let groupsContainer = document.getElementById("groups-content");
    groupsContainer.appendChild(createColorGroup());
}

let stub = function () { window.alert("button is not ready"); };
window.saveFileAs = stub;
window.saveFile = stub;

function initUpperContainer() {
    
}

function initColorGroups() {
    // let colorsMenu = document.getElementById("colors-groups-menu");
    // let testListItem = document.createElement("li");
    // testListItem.textContent = "click me";
    // testListItem.addEventListener("dblclick", (event) => {stub()});
    // colorsMenu.appendChild(testListItem);
}

(async function () { 
    await window.reloadDynDocs();
    initUpperContainer();
    initColorGroups();
} )();


