import './style.css';
import './app.css';

import logo from './assets/images/logo-universal.png';
import {OpenFileDialog} from "../wailsjs/go/main/App";

const APP_SOURCE_HTML = 'test.html'

let appElement = document.querySelector('#app');

window.reloadDynDocs = async function() {
    await fetch(APP_SOURCE_HTML)
    .then(response => {
        if (!response.ok) {
            throw new Error("html file load error");
        }
        return response.text();
    })
    .then(htmlContent => {
        appElement.innerHTML = htmlContent;
    })
    .catch(error => {
        console.error("error fetching HTML:", error);
        appElement.innerHTML = '<p>Error</p>';
    });
    document.getElementById('logo').src = logo;
    document.getElementById("name").focus();
}

let init = async function initialize() {
    await window.reloadDynDocs()
}
init()

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
}
