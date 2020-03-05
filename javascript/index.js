const path = require('path');
const fs = require('fs');
const SAVE_FILENAME = './story.json';

/**
 * Gets the driver to place a script tag containing the css from the file at @param path
 * @param driver
 * @param path
 * @return {Promise<void>}
 */
async function loadCss(driver, path) {
    await driver.executeScript(
        `
        const style = document.createElement('style');
        style.innerHTML = arguments[0];
        document.body.appendChild(style);
        `
        , fs.readFileSync(path).toString());
}

/**
 * Loads all necessary javascript for this project
 * @param driver {WebDriver}
 * @return {Promise<void>}
 */
async function loadJavascript(driver) {
    await loadBundle(driver, path.join(__dirname, 'bundle.js'), 'unique');
    await loadBundle(driver, path.join(__dirname, 'jquery.js'));
    await loadBundle(driver, path.join(__dirname, 'jquery.toast.min.js'));
    await loadCss(driver, path.join(__dirname, 'jquery.toast.min.css'));
    await driver.executeScript(`window.prompt = ${prompt.toString()}`);
    // await loadBundle(driver, path.join(__dirname, 'jquery-modal.js')); TODO do we need this?
}

/**
 * Get your driver to create a script element with text from the file at @param path
 * Pass a globalName to have whatever the javascript returned available to all
 * @param driver
 * @param path
 * @param globalName
 * @return {Promise<void>}
 */
async function loadBundle(driver, path, globalName) {
    const text = fs.readFileSync(path).toString();
    const f = () => {
        const scriptTag = document.createElement('script');
        scriptTag.innerText = arguments[0];
        document.body.appendChild(scriptTag);
    };

    let args;
    if (globalName) {
        args = `${globalName} = ${text}`;
    } else {
        args = text;
    }
    await driver.executeScript(
        `
        const scriptTag = document.createElement('script');
        scriptTag.innerHTML = arguments[0];
        document.body.appendChild(scriptTag);
        `
        , args);
}

/**
 * Kindly asks the JQuery instance to place a toast message on the screen
 * @param driver
 * @param msg
 * @return {Promise<void>}
 */
async function debugToast(driver, msg) {
    await driver.executeScript(
        `
            $.toast("${msg}")
        `
        , fs.readFileSync(path).toString());
}

/**
 * This is how we prompt the user for the names of its selectors
 * @param sel {string}
 */
function prompt(sel) {
    const selElement = $(sel)[0];
    const modalElement = document.createElement('div');
    const modalNameInput = document.createElement('input');
    modalNameInput.className = 'name-selector-prompt';
    modalNameInput.placeholder = sel;
    modalElement.style = `
        position: absolute;
        left: ${modalElement.offsetLeft},
        top: ${modalElement.offsetTop}
        `;
    modalElement.appendChild(modalNameInput);
    selElement.parentElement.appendChild(modalElement);
    modalNameInput.focus();
    // I think our event reactor function can check for our modal className
    // And send the events itself
    // Then its gotta delete the parent once its doen
}

/**
 * Loads the story object, from disk if it hasn't been already
 * @return {*}
 */
function getStoryObject() {
    return fs.existsSync(SAVE_FILENAME) ?
        JSON.parse(fs.readFileSync(SAVE_FILENAME).toString()) :
        {names: {}, actions: []};
}

/**
 * Persists the current story object to disk
 * @param o
 */
function saveStoryObject(o) {
    fs.writeFileSync(SAVE_FILENAME, JSON.stringify(o, null, '\t'));
}

/**
 * Adds a definition to the story object
 * @param sel
 * @param name
 */
function addDefinitionToStoryObject(sel, name) {
    const storyObject = getStoryObject();
    storyObject.names[sel] = name;
    saveStoryObject(storyObject);
}

/**
 * Adds an action upon a subject to the story object
 * @param action
 * @param subject
 */
function addActionToStoryObject(action, subject) {
    const storyObject = getStoryObject();
    storyObject.actions.push({action, subject});
    saveStoryObject(storyObject);
}

/**
 * Sets window.storyObject
 * @param d
 * @param storyObject
 * @return {*}
 */
function updateStoryObjectInBrowser(d, storyObject) {
    const s = JSON.stringify(storyObject);
    return d.executeScript(`
    window.storyObject = JSON.parse(arguments[0]);
    `, s);
}

/**
 *
 * @param d {WebDriver}
 * @param storyObject
 */
function setStoryDisplayText(d, storyObject) {
    const defintions = Object.entries(storyObject.names)
        .map(([selector, name]) => `${name} is ${selector}.`);
    const actions = storyObject.actions.map(({action, subject}) => {
        return `${action} ${subject}.`
    });

    const f = () => {
        const storyEl = document.getElementById('user-story-element');
        // First get rid of all children
        [...storyEl.children].forEach(e => e.remove());
        storyEl.innerText = arguments[0];
    }
    const s = f.toString();
    let script = `(${s})()`;
    return d.executeScript(script, defintions.concat(actions).join('\n'));
}

/**
 * Create an instance of the story display
 *
 * @param d {WebDriver}
 */
function createStoryDisplay(d) {
    function f() {
        const storyEl = document.createElement('div');
        storyEl.id = 'user-story-element';
        storyEl.style.top = '0';
        storyEl.style.position = 'fixed';
        storyEl.style.backgroundColor = 'black';
        storyEl.style.minHeight = '100px';
        storyEl.style.minWidth = '100px';
        document.body.appendChild(storyEl)
    }

    return d.executeScript(`(${f.toString()})()`);
}

/**
 * Uses nearly to parse a sentence, returning objects for selenium to execute
 * @param sentence
 * @return {{[p: string]: *}}
 */
function parseSentence(sentence) {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(sentence);
    let value = parser.results;
    if (!value.length) {
        console.info(sentence)
    }
    if (!value[0]) {
        console.log();
    }
    const t = value[0][0];
    Object.keys(t).forEach(k => {
        // This is a weird hack because sometimes elements are arrays which should not be
        if (Array.isArray(t[k])) {
            t[k] = t[k][0];
        }
    });
    // console.log(JSON.stringify(value, null, /**/'\t'));
    return {...t, sentence};
}

/**
 * Converts the storyObject into sentences, and then calls executeSentences
 * @param driver
 * @return {Promise<void>}
 */
async function executeStoryObject(driver) {
    const o = getStoryObject();
    const sentences = Object.entries(o.names).map(([sel, name]) => `${name} is ${sel}.`);
    sentences.push(...o.actions.filter(({action, subject}) => action && subject).map(({action, subject}) => `${_.capitalize(action)} the ${subject}.`));
    await executeSentences(driver, sentences);
}

/**
 * Converts e
 * @param driver
 * @param sentences
 * @return {Promise<void>}
 */
async function executeSentences(driver, sentences) {
    try {
        const parsedSentences = sentences.map(s => parseSentence(s));
        const scope = {};
        let scopeElement;
        for (let i = 0; i < parsedSentence.length; i++) {
            const p = parsedSentence[i];
            switch (p.type) {
                case "definition":
                    const {varName, selector} = p;
                    scope[varName] = selector;
                    break;
                case "action":
                    const {verb, article, noun} = p;
                    switch (verb) {
                        case "Click":
                            // For now you can only reference nouns by their variable names, not raw selectors
                            scopeElement = scope[noun];
                            if (!scopeElement) {
                                throw new Error(`Unknown variable ${noun}`);
                            }
                            // Tell selenium to click something, maybe do some mousing over
                            // TODO figure out if I can just put a selector in here
                            const e = await driver.findElement(webdriver.By.css(scopeElement));
                            e.click();
                            break;
                        case "Type":
                            // TODO this is a terrible hack, but it will work for now
                            const el = await driver.findElement(webdriver.By.css(scopeElement));
                            await el.sendKeys(noun);
                            break;
                        // Send selenium something
                        /*
                                                    for (let j = 0; j < noun.length; j++) {
                                                        const nounElement = noun[j];
                                                        await new webdriver.ActionSequence(driver)
                                                            .keyDown(nounElement);
                                                        await new webdriver.ActionSequence(driver)
                                                            .keyUp(nounElement);
                                                    }
                        */
                        // TODO see if the above works, I shoud be able to get to the pcs with selenium
                    }
                    await sleep(2000);
                    break;
            }
        }
    } catch (e) {
        console.error(e)
        await sleep(10000)
    } finally {
        driver.close()
    }
}

module.exports = {
    loadBundle,
    loadCss,
    loadJavascript,
    prompt,
    executeStoryObject,
    addActionToStoryObject,
    addDefinitionToStoryObject,
    getStoryObject,
    updateStoryObjectInBrowser,
    setStoryDisplayText,
    createStoryDisplay

};

