import './style.css';

import {
    LoadColorsFile,
    SaveColorsDialog,
    ColorsBackupRestore,
    OverwriteColorsFiles,
    OpenImgFileDialog,
    StashImgByFilename,
    ExportImgDialog,
    OpenFileExplorer,
} from "../wailsjs/go/main/App";
import {
    GlobColorGroups,
    ColorGroup,
    onDocsReload,
    onFileReload,
    restoreColors,
    getSelectedColorElement,
} from './elements';
import {
    Btn,
    Dialog,
} from './utils'

const APP_SOURCE_HTML = 'page.html';
const APP_SOURCE_CSS = 'style.css';

var appElement = document.querySelector('#app');
var colorGroupsContainer = null;
var screenshotViewContainer = null;
var descContainer = null;

var _loadedColorsFile = null;

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
        colorGroupsContainer = document.getElementById("__groups-content");
        if (colorGroupsContainer === null) {
            throw new Error("'__groups-content' element not found");
        }
        screenshotViewContainer = document.getElementById("__screenshot-view-container");
        if (screenshotViewContainer === null) {
            throw new Error("'__screenshot-view-container' element not found");
        }
        descContainer = document.getElementById("__desc-container");
        if (descContainer === null) {
            throw new Error("'__desc-container' element not found");
        }
        onDocsReload();
        _loadedColorsFile = null;
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

window.loadFile = function () {
    try {
        LoadColorsFile()
            .then((res) => {
                if (res.colorGroups === null) {
                    return;
                }
                if (GlobColorGroups !== undefined) {
                    GlobColorGroups.values().forEach(cg => { cg.delete() });
                    GlobColorGroups.clear();
                }
                onFileReload();
                res.colorGroups.forEach(group => {
                    let cg = new ColorGroup(group, screenshotViewContainer, descContainer);
                    colorGroupsContainer.appendChild(cg.getHtmlElement());
                });
                _loadedColorsFile = res.file;
            })
            .catch((err) => {
                console.error(err);
                window.alert(`critical error: ${err}`);
            });
    } catch (err) {
        window.alert(`critical error: ${err}`);
        console.error(err);
    }
};

window.addColorGroup = function () {
    if (_loadedColorsFile === null) {
        window.alert("no file loaded");
        return
    }
    let cg = new ColorGroup(
        {
            name: "new group",
            colorspace: 0,
            colors: [],
        },
        screenshotViewContainer,
        descContainer
    );
    colorGroupsContainer.appendChild(cg.getHtmlElement());
    cg._renameField.value = cg._groupLabel.textContent;
    cg._groupLabel.replaceWith(cg._renameField);
    cg._renameField.focus();
    cg._renameField.select();
}

window.saveFileAs = async function () {
    if (GlobColorGroups === undefined) {
        return
    }
    try {
        let arr = Array.from(GlobColorGroups.values()).map((group) => group.toJSON());
        SaveColorsDialog(arr)
            .then((res) => {
                if (res.error !== null) {
                    console.error(res.error);
                    window.alert(res.error);
                }
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

window.restoreColors = function() {
    try {
        ColorsBackupRestore()
        .then((origColorGroups) => {
            if (origColorGroups === null) {
                return
            }
            restoreColors(origColorGroups);
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

// overwrite opened file with changes
window.saveFile = function () {
    if (_loadedColorsFile === null) {
        window.alert("no colors file loaded");
        return
    }
    try {
        let arr = Array.from(GlobColorGroups.values().map((group) => group.toJSON()));
        OverwriteColorsFiles(_loadedColorsFile, arr)
        .catch((err) => {
            console.error(err);
            window.alert(`critical error: ${err}`);
        })
    } catch (err) {
        console.error(err);
        window.alert(`critical error: ${err}`);
    }
};

window.selectImg = function() {
    let selectedElem = getSelectedColorElement();
    if (selectedElem === null) {
        window.alert("select element to add image");
        return
    }
    // copy img to stash then set src path from stashed img
    OpenImgFileDialog()
    .then(async (selectedImg) => {
        StashImgByFilename(selectedImg, _loadedColorsFile)
        .then((stashedImg) => {
            selectedElem.getColorView().setImgSrcFS(stashedImg);
        })
        .catch(err => {
            console.log(err);
            window.alert(err);
        })
    })
    .catch((err) => {
        console.error(err);
        window.alert(`critical error: ${err}`);
    });
};

window.exportImg = function() {
    let selectedElem = getSelectedColorElement();
    if (selectedElem === null) {
        window.alert("select color to export image from");
        return
    }
    let imgFilepath = selectedElem.getColorView().getImgFilepath();
    if (imgFilepath === null) {
        window.alert("color has no image");
        return
    }
    ExportImgDialog(imgFilepath).then((savedFile) => {
        let acceptBtn = new Btn(() => {
            OpenFileExplorer(savedFile.substring(0, savedFile.lastIndexOf("\\") + 1))
        }, "open");
        let cancelBtn = new Btn(() => {}, "close");
        let dial = new Dialog("Image saved", acceptBtn, cancelBtn, 150, 100)
        document.getElementById("app-container").appendChild(dial._html);
        dial.Show();
    })
};

(async function () {
    await window.reloadDynDocs();
} )();
