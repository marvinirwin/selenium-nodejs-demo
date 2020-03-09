const path = require('path');
const fs = require('fs');
const SAVE_FILENAME = './story.json';
const _ = require('lodash');
const nearley = require('nearley');
const grammar = require('../grammar/grammar');
const webdriver = require('selenium-webdriver');
const sleep = n => new Promise(resolve => setTimeout(resolve, n));
const {Subject, BehaviorSubject} = require('rxjs');

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
    await loadBundle(driver, path.join(__dirname, 'lodash.js'));
    await loadCss(driver, path.join(__dirname, 'jquery.toast.min.css'));
    await loadBundle(driver, path.join(__dirname, 'jquery-ui.min.js'));
    await loadCss(driver, path.join(__dirname, 'jquery-ui.min.css'));
    await loadCss(driver, path.join(__dirname, 'jquery-ui.structure.min.css'));
    await loadCss(driver, path.join(__dirname, 'jquery-ui.theme.min.css'));
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
    );
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
 * Create an instance of the story display
 *
 * @param d {WebDriver}
 */
function createSentenceListAndInputBox(d) {
    function f() {
        const containerEl = document.createElement('div');
        const textEl = document.createElement('textarea');
        const storyEl = document.createElement('ol');
        textEl.onchange = _.debounce(e => {
            // TODO check that this innerText is the right thing to look for
            // Also, this should probably be debounced
            // I could use lodash
            // Yeah I should load lodash into the browser
            window.seleniumContext.story$.next(e.target.innerText);
        }, 1000);

        window.seleniumContext.story$.subscribe(v => {

        });
        containerEl.appendChild(textEl);
        containerEl.appendChild(storyEl);
        storyEl.id = 'user-story-element';
        storyEl.style.top = '0';
        storyEl.style.position = 'fixed';
        // storyEl.style.backgroundColor = 'black';
        storyEl.style.minHeight = '100px';
        storyEl.style.minWidth = '100px';
        document.body.appendChild(storyEl);


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
        for (let i = 0; i < parsedSentences.length; i++) {
            const p = parsedSentences[i];
            switch (p.type) {
                case "definition":
                    const {varName, selector} = p;
                    debugToast(driver, `${varName} is ${selector}`);
                    scope[varName] = selector;
                    break;
                case "action":
                    const {verb, article, noun} = p;
                    debugToast(driver, `${verb} ${noun}`);
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

/**
 *
 * @param driver {Driver}
 * @param id
 */
function removeElement(driver, id) {
    driver.executeScript(`
    const [id] = arguments;
    document.getElementById(id).remove(); 
    `, id);
}

/**
 * Performs all necessary setup for a DSL IDE/interpreter
 * @param page
 * @param browser
 * @return {Promise<WebDriver>}
 */
async function setup(page, browser = 'chrome') {
    const d = new webdriver.Builder()
        .forBrowser(browser)
        .build();
    await d.get(page);

    return d;
}

class SeleniumContext {
    constructor() {
        this.story$ = new BehaviorSubject();
        this.keydown$ = new Subject();
        this.click$ = new Subject();
        this.addAction$ = new Subject();
        this.addDefinition$ = new Subject();
        this.executeStory$ = new Subject();
    }
}

class DriverObs {
    constructor(d, story) {
        this.seleniumContext = new SeleniumContext();
        this.driver$ = new BehaviorSubject(d);
        (async () => {
            await setupMessagePasser(d);
            await loadJavascript(d);
            await createSentenceListAndInputBox(d);
        })();


        this.seleniumContext.subscribe(s => {
            fs.writeFile('./story.txt', s);
            setStoryDisplayText(d, s);
            debugToast(this.driver$.getValue(), 'Updated story');
        });
        this.seleniumContext.addAction$.subscribe(v => {
            this.seleniumContext.story.next(insertActionIntoStory(v, this.seleniumContext.story$.getValue()))
        });
        this.seleniumContext.addDefinition$.subscribe(v => {
            this.seleniumContext.story.next(insertDefinitionIntoStory(v, this.seleniumContext.story$.getValue()))
        })
        this.seleniumContext.executeStory$.subscribe(v => {

        })
    }
}

const allEventTypes = [
    'ACTION',
    'EXECUTE_STORY',
    'NAME_SELECTOR',
];
async function setupRecorder(driver) {
    const setupRecorder = () => {
        function handleEvents(e) {
            /**
             * @type {KeyboardEvent}
             */
            let ek = e;
            switch (e.type) {
                case "click":
                    if (e.target.className === 'name-selector-prompt') {
                        return [false, null];
                    }
                    // For now only record things with the shift key
                    if (!e.shiftKey) {
                        return [false, null];
                    }
                    let s = unique(e.target);
                    let storyObject = window.storyObject;
                    let name1 = window.storyObject.names[s];
                    if (!name1) {
                        window.prompt(s);
                    } else if (name1) {
                        return [
                            true, {
                                type: 'ACTION',
                                action: e.type,
                                subject: name1
                            }];
                    }
                    return [
                        false,
                        null
                    ];
                case "keydown":
                    $.toast(`key: ${e.key} alt: ${e.altKey} ctrl: ${e.ctrlKey}`);
                    if (ek.key === 'e' && ek.ctrlKey) {
                        return [true, {
                            type: "EXECUTE_STORY",
                        }];
                    }
                    if (ek.target.className === 'name-selector-prompt' && ek.key === "Enter") {
                        let newName = e.target.value;
                        const p = e.target.placeholder;
                        let newVar = {
                            type: "NAME_SELECTOR",
                            newName: newName,
                            selectorForElementGettingNamed: p
                        };
                        e.target.remove();
                        return [
                            true,
                            newVar
                        ]
                    }

                    return [false, null];
                default:
                    return [false, null]
            }
        }

        function handleEv(e) {
            const ret = handleEvents(e);
            // If handleEvents didn't return anything, return
            if (!ret) return;

            const [success, result] = ret;
            if (!success) return;
            switch(result.type) {
                case "NAME_SELECTOR":
                    window.seleniumContext.addDefinition$.next(result);
                    break;
                case "ACTION":
                    window.seleniumContext.addAction$.next(result);
                    break;
                case "EXECUTE_STORY":
                    // Since these things only propagate if they're different then
                    // We have to inc, this is a cheap hack
                    // Should probably use reduce here
                    window.seleniumContext.executeStory$.next(
                        window.seleniumContext.executeStory$.getValue() + 1
                    )
                    break;
            }
        }

    };
    let s = `
    const f = () => ${handleEvents.toString()}
    
    `;
    console.log(s);

    driver.executeScript(s);
}
async function setupMessagePasser(driver, seleniumContext) {
    // Create window.seleniumContext with all the keys of seleniumContext
    const setupObservables = () => {
        // This function creates a "fake" behaviorSubject
        function getObs(name, v) {
            const subject$ = {
                v,
                subscribers: [],
                next(v) {
                    if (typeof v !== 'string') {
                        throw new Exception("Can only send strings through the seleniumContext!")
                    }
                    if (v !== v) {
                        this.v = v;
                        this.subscribers.forEach(f => f(v));
                    }

                },
                subscribe(cb) {
                    this.subscribers.push(cb);
                }
            };
            subject$.subscribe(v =>
                window.sendMessageToSelenium(
                    name,
                    JSON.stringify(
                        {
                            story: v
                        }
                    )))
        }

        // getObs uses this function to send messages to the observables on the other side
        body.sendMessageToSelenium = function (sender, msg) {
            const el = document.createElement('div');
            el.id = `selenium-event-a${counter}`;
            counter++;
            el.className = 'selenium-event';
            el.style = 'top: -1000';
            el.textContent = JSON.stringify({sender, message: msg});
            document.body.appendChild(el);
        };


        let counter = 0;
        // Set up the seleniumContext
        window.seleniumContext = {};
        const seleniumContext = JSON.parse(arguments[0]);

        // Fill up window.seleniumContext
        Object.entries(seleniumContext)
            .forEach(([key, initValue]) => window.seleniumContext[key] = getObs(key, initValue));

    };

    await driver.executeScript(
        setupObservables.toString(),
        JSON.stringify(seleniumContext)
    );


    // Start scanning for messages from selenium.  Once you get them pass them to our seleniumContext
    setInterval(async () => {
        const els = await driver.findElements(webdriver.By.className('selenium-event'));
        for (let i = 0; i < els.length; i++) {
            const el = els[i];
            let msg = await el.getText();
            let id = await el.getAttribute('id');
            removeElement(driver, id);
            const {sender, message} = JSON.parse(msg);
            seleniumContext[sender].next(message);
        }
    }, 500);

    // Whenever we update one of our keys in node, update the same one in the browser
    Object.keys(seleniumContext).forEach(k => {
        seleniumContext[k].subscribe(v => {
            driver.executeScript(
                `
                const [k, v] = JSON.parse(arguments[0]);
                // prevent an infinite loop here
                if (window.seleniumContext[k].v !== v) {
                    window.seleniumContext[k].next(v);
                }
                `, JSON.stringify([k, v])
            );
        })
    });

    return cb
}

async function passMessageFromSelenium(driver, type, message) {
    const f = () => {
        const {type, message} = arguments[0];
        let s = `$${type}`;
        if (!seleniumContext[s]) {
            window.prompt(`Unknown context key ${s}`);
        }
        window.seleniumContext[s].next(message);
    }
}

async function createSharedContext(driver) {
    const f = () => {

        window.seleniumContext = {};

        function addProp(k, initValue) {
            window.seleniumContext[k] = {
                value: initValue,
                listeners: []
            }
        }

        window.updateContextValue = function (k, v) {
            const old = window.seleniumContext[k].value;
            window.seleniumContext[k].value = v;
            window.seleniumContext[k].listeners.forEach(l => l(old, v));

        };
        window.getContextValue = function (k) {
            return window.seleniumContext[k].value
        };
    };

}

function parseStory(story) {
    return story.split('\n').map(parseStory);
}

async function insertActionIntoStory(action, story) {
    return story + '\n' + action;
}

async function insertDefinitionIntoStory(definition, story) {
    const els = story.split('\n');
    const firstAction = els.findIndex(({type}) => type === 'action');
    return els.slice(0, firstAction).concat(definition).concat(els.slice(firstAction)) // TODO I don't know if this will work
}

function loadStoryFromDisk() {
    return fs.existsSync('./story.txt') ? fs.readFileSync('./story.txt') : '';
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
    createStoryDisplay: createSentenceListAndInputBox,
    setup,
    debugToast,
    updateStory,
    SeleniumContext,
    DriverObs,
    loadStoryFromDisk

};

