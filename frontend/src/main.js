import './style.css';
import './app.css';

import logo from './assets/images/logo-universal.png';
import {OpenFileDialog} from "../wailsjs/go/main/App";

let appElement = document.querySelector('#app');

window.reloadDynDocs = async function() {
    console.log("reloading documents")
    await fetch('test.html')
    .then(response => {
        if (!response.ok) {
            throw new Error("html file load error");
        }
        return response.text();
    })
    .then(htmlContent => {
        appElement.innerHTML = htmlContent;
        console.log("HTML content: ", htmlContent)
        console.log("app inner HTML after reload: ", appElement.innerHTML)
        // document.querySelector('#app').innerHTML = htmlContent;
    })
    .catch(error => {
        console.error("error fetching HTML:", error);
        appElement.innerHTML = '<p>Error</p>';
        // document.querySelector('#app').innerHTML = '<p>Error</p>';
    });
    document.getElementById('logo').src = logo;
    document.getElementById("name");
    nameElement.focus();
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
