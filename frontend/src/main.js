import './style.css';

import {LoadColorsFile, SaveColors} from "../wailsjs/go/main/App";
import { 
    createColorGroup,
    colorGroupToJson,
    onDocsReload,
} from './elements';

const APP_SOURCE_HTML = 'test.html';
const APP_SOURCE_CSS = 'style.css';

var appElement = document.querySelector('#app');
var screenshotViewContainer = null;
var descContainer = null;

// reload user-editable html and css
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
        screenshotViewContainer = document.getElementById("__screenshot-view-container");
        descContainer = document.getElementById("__desc-container");
        if (screenshotViewContainer === null) {
            throw new Error("'__screenshot-view-container' element not found");
        }
        if (descContainer === null) {
            throw new Error("'__desc-container' element not found");
        }
        onDocsReload();
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

window.openFileDialog = function () {
    try {
        LoadColorsFile()
            .then((result) => {
                let groupsContiner = document.getElementById("groups-content");
                if (result === null) {
                    return;
                }
                result.forEach(group => {
                    let res = createColorGroup(group, screenshotViewContainer, descContainer);
                    groupsContiner.appendChild(res.containerElem);
                });
            })
            .catch((err) => {
                console.error(err);
                window.alert(`critical error: ${err}`)
            });
    } catch (err) {
        window.alert(`critical error: ${err}`)
        console.error(err);
    }
};

window.addColorGroup = function () {
    window.alert("not ready yet")
}

window.saveFileAs = async function () {
    try {
        let colorGroups = document.getElementsByClassName("colors-group-menu");
        let arr = Array.from(colorGroups).map((group) => colorGroupToJson(group));
        SaveColors(arr)
            .then((result) => {
                if (result !== null) {
                    console.error(result);
                    window.alert(result);
                }
                window.alert("File saved");
            })
            .catch((err) => {
                console.error(err);
                window.alert(`critical error: ${err}`);
            })
    } catch (err) {
        console.error(err);
        window.alert(`critical error: ${err}`);
    }
}

let stub = function () { window.alert("button is not ready"); };
window.saveFile = stub;

(async function () {
    await window.reloadDynDocs();
} )();


