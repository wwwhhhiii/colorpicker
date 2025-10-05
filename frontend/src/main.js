import './style.css';

import {LoadColorsFile} from "../wailsjs/go/main/App";
import { 
    createColorGroup
} from './elements';

const APP_SOURCE_HTML = 'test.html';
const APP_SOURCE_CSS = 'style.css';

let appElement = document.querySelector('#app');
let imagePlaceholderElem = null;

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

window.openFileDialog = function () {
    try {
        LoadColorsFile()
            .then((result) => {
                let groupsContiner = document.getElementById("groups-content");
                if (result === null) {
                    return;
                }
                result.forEach(group => {
                    let res = createColorGroup(group, imagePlaceholderElem);
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

let stub = function () { window.alert("button is not ready"); };
window.saveFileAs = stub;
window.saveFile = stub;

function initUpperContainer() {
    
}

function initColorGroups() {

}

(async function () {
    await window.reloadDynDocs();
    initUpperContainer();
    initColorGroups();
    imagePlaceholderElem = document.getElementById("__clipboard-img-dest");
} )();


