import './style.css';

import {OpenFileDialog} from "../wailsjs/go/main/App";

const APP_SOURCE_HTML = 'test.html';
const APP_SOURCE_CSS = 'style.css';

let appElement = document.querySelector('#app');

window.reloadDynDocs = async function() {
    await fetch(APP_SOURCE_HTML)
    .then(response => {
        if (!response.ok) {
            throw new Error("HTML file load error");
        }
        return response.text();
    })
    .then(htmlContent => async function () {
        // inject .html
        appElement.innerHTML = htmlContent;
        // inject .css
        await fetch(APP_SOURCE_CSS)
        .then(response => {
            if (!response.ok) {
                throw new Error("CSS file load error");
            }
            return response.text();
        })
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
            appElement.innerHTML = '<p>Error during style files load</p>';
        })
    }())
    .catch(error => {
        console.error("error fetching HTML:", error);
        appElement.innerHTML = '<p>Error during style files load</p>';
    });
};

(async function () { await window.reloadDynDocs(); } )();

window.openFileDialog = function () {
    try {
        OpenFileDialog()
            .then((result) => {
                document.getElementById("result").innerText = result;
            })
            .catch((err) => {
                console.error(err);
                throw new Erorr("error:", err)
            });
    } catch (err) {
        console.error(err);
    }
};

let stub = function () { window.alert("button is not ready"); };
window.saveFileAs = stub;
window.saveFile = stub;
