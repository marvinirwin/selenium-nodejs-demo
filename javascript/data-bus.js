const webdriver = require('selenium-webdriver');
const {debugToast} = require("./index");
const {setStoryDisplayText} = require("./index");
const {BehaviorSubject, Subject} = require('rxjs');
const fs = require('fs')
const {parseSentence} = require("./index");
const {executeSentences} = require("./index");
const {insertDefinitionIntoStory} = require("./index");
const {insertActionIntoStory} = require("./index");
const {loadJavascript} = require("./index");
const input = require('selenium-webdriver/lib/input');
const {createSentenceListAndInputBox} = require('./ui');
const command = require('selenium-webdriver/lib/command');


const sleep = n => new Promise(resolve => setTimeout(resolve, n));

class SeleniumContext {
    constructor() {
        this.story$ = new BehaviorSubject('');
        this.keydown$ = new Subject();
        this.click$ = new Subject();
        this.addAction$ = new Subject();
        this.addDefinition$ = new Subject();
        this.executeStory$ = new Subject();
        this.unit_test_bh$ = new BehaviorSubject('');
        this.uniqueNameMap$ = new BehaviorSubject('{}');
        // There is a nicer way to do this with combineLatest
        this.story$.subscribe(v => {
            const uniqueMap = {};
            if (!v.split) {
                console.info()
            }
            v.split('\n')
                .filter(v => v)
                .map(parseSentence)
                .filter(({type}) => type === 'definition')
                .forEach(({varName, selector}) => uniqueMap[selector] = varName);
            let value = JSON.stringify(uniqueMap);
            this.uniqueNameMap$.next(value);
        });
        Object.keys(this).forEach(k => {
                this[k].subscribe(v => console.log(`${k} updated to ${v}`))
            }
        )
    }
}

class DriverObs {
    /**
     *
     * @param d {WebDriver}
     * @param story
     */
    constructor(d, story) {
        let f = d.executeScript;
        d.executeScript = function(script, ...args) {
            if (typeof script === 'function') {
                script = 'return (' + script + ').apply(null, arguments);';
            }
            console.log(script);
            return this.execute(
                new command.Command(command.Name.EXECUTE_SCRIPT).
                setParameter('script', script).
                setParameter('args', args));
        };
        this.seleniumContext = new SeleniumContext();
        /**
         * @type {WebDriver}
         */
        this.driver = d;
    }

    async setup() {
        await loadJavascript(this.driver);
        await setupMessagePasser(this.driver, this.seleniumContext);
        await this.driver.executeScript('console.log(window.seleniumContext)');
        await createSentenceListAndInputBox(this.driver);
        this.seleniumContext.story$.subscribe(s => {
            fs.writeFileSync('./story.txt', s);
            debugToast(this.driver, 'Updated story');
        });
        // TODO use combineLatest here
        this.seleniumContext.addAction$.subscribe(v => {
            this.seleniumContext.story$.next(insertActionIntoStory(v, this.seleniumContext.story$.getValue()));
        });
        this.seleniumContext.addDefinition$.subscribe( v => {
            this.seleniumContext.story$.next(insertDefinitionIntoStory(v, this.seleniumContext.story$.getValue()));
        });
        this.seleniumContext.executeStory$.subscribe(v => {
            executeSentences(this.driver, this.seleniumContext.story$.getValue().split('\n').filter(v => v.trim()));
        });
        await setupRecorder(this.driver);
    }
}

const allEventTypes = [
    'ACTION',
    'EXECUTE_STORY',
    'NAME_SELECTOR',
];

async function setupRecorder(driver) {
    const setup = () => {
        function filterEvent(e) {
            /**
             * @type {KeyboardEvent}
             */
            let ek = e;
            switch (e.type) {
                case "click":
                    // $.toast(`responding to click shift:${e.shiftKey}`);
                    if (e.target.className === 'name-selector-prompt') {
                        return [false, null];
                    }
                    // For now only record things with the shift key
                    if (!e.shiftKey) {
                        return [false, null];
                    }
                    let s = unique(e.target);
                    // Oh, I never did figure out a way to get definitions
                    // I gotta keep a definitionMap up beside the story$
                    const map = JSON.parse(window.seleniumContext.uniqueNameMap$.v);
                    let elementStoryName = map[s];
                    if (!elementStoryName) {
                        window.prompt(s);
                    } else if (elementStoryName) {
                        return [
                            true, {
                                type: 'ACTION',
                                action: e.type,
                                subject: elementStoryName
                            }];
                    }
                    return [
                        false,
                        null
                    ];
                case "keydown":
                    // $.toast(`key: ${e.key} alt: ${e.altKey} ctrl: ${e.ctrlKey}`);
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
                            sentence: `${newName} is ${p}.`
                        };
                        e.target.remove();
                        return [
                            true,
                            newVar
                        ]
                    }
                    return [false, null];
                case "keypress":
                    // Two things cause the keybuffer to flush.  Losing focus, or not typing for a second
                    window.keyBuffer += e.key;
                    window.keyBufferLastHit = new Date();
                    return [false, null];
                default:
                    return [false, null];
            }
        }

        function handleEv(e) {
            const ret = filterEvent(e);
            // If handleEvents didn't return anything, return
            if (!ret) return;

            const [success, result] = ret;
            if (!success) return;
            switch (result.type) {
                case "NAME_SELECTOR":
                    $.toast(`naming selector ${result.sentence}`);
                    window.seleniumContext.addDefinition$.next(result.sentence);
                    break;
                case "ACTION":
                    $.toast('adding action ' + JSON.stringify(result));
                    // TODO dont hardcode Click (the browser event is called click and the grammar wants Click
                    window.seleniumContext.addAction$.next(`Click the ${result.subject}.`);
                    break;
                case "EXECUTE_STORY":
                    $.toast('executing story');
                    // Since these things only propagate if they're different then
                    // We have to inc, this is a cheap hack
                    // Should probably use reduce here
                    window.seleniumContext.executeStory$.next(
                        `${window.seleniumContext.executeStory$.value + 1}`
                    );
                    break;
            }
        }

        document.onkeydown = handleEv;
        document.onclick = handleEv;

        /**
         * Set an interval to flush the keybuffer
         * If we have to flush the keybuffer manually, this means that the user stopped typing and never unfocused the element
         */
        setInterval(() => {
            const activeEl = document.activeElement;
            let s = unique(activeEl);
            const map = JSON.parse(window.seleniumContext.uniqueNameMap$.v);
            if (map[s]){
                window.prompt(s);
            } else {
                ''
            }
        })
    };

    driver.executeScript(setup);
}

async function setupMessagePasser(driver, seleniumContext) {
    // Create window.seleniumContext with all the keys of seleniumContext
    const setupObservables = () => {
        // This function creates a "fake" behaviorSubject
        function sendMessageToNode(sender, msg) {
            const el = document.createElement('div');
            el.id = `selenium-event-a${counter}`;
            counter++;
            el.className = 'selenium-event';
            el.style = 'top: -1000';
            el.textContent = JSON.stringify({sender, message: msg});
            document.body.appendChild(el);
        }
        window.sendMessageToNode = sendMessageToNode;

        function getObs(name, v = '') {
            const subject$ = {
                v,
                subscribers: [],
                next(v = '', sendToSelenium = true) {
                    if (!v) v = '';
                    if (typeof v !== 'string') {
                        throw new Error(`Can only send strings through the seleniumContext! not ${typeof v} ${JSON.stringify(v)}`)
                    }
                    if (this.v !== v) {
                        this.v = v;
                        $.toast(`${name} changed to ${v}`);
                        this.subscribers.forEach(f => f(v, sendToSelenium));
                    }

                },
                subscribe(cb) {
                    this.subscribers.push(cb);
                }
            };
            subject$.subscribe((v, sendToSelenium = true) => {
                    if (!sendToSelenium) {
                        return;
                    }
                    window.sendMessageToNode(
                        name,
                        v
                    )
                }
            )
            return subject$;
        }

        // getObs uses this function to send messages to the observables on the other side


        let counter = 0;
        // Set up the seleniumContext
        window.seleniumContext = {};
        const seleniumContext = JSON.parse(arguments[0]);

        // Fill up window.seleniumContext
        Object.entries(seleniumContext)
            .forEach(([key, initValue]) => window.seleniumContext[key] = getObs(key, initValue));
        $.toast(`New seleniumContext ${JSON.stringify(window.seleniumContext, null, '\t')}`)
    };

    const stringContext = {};
    Object.keys(seleniumContext).map(k => stringContext[k] = stringContext.getValue ? stringContext.getValue() : '');
    await driver.executeScript(
        setupObservables,
        JSON.stringify(stringContext)
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
            debugToast(driver, `sender: ${sender} message: ${message}`);
            seleniumContext[sender].next(message); // Tell it not to send the message back
        }
    }, 500);

    // Whenever we update one of our keys in node, update the same one in the browser
    Object.keys(seleniumContext).forEach(k => {
        seleniumContext[k].subscribe(v => {
            driver.executeScript(
                `
                const [k, v] = JSON.parse(arguments[0]);
                if (window.seleniumContext[k].v !== v) {
                    window.seleniumContext[k].next(v, false);
                }
                `, JSON.stringify([k, v])
            );
        })
    });
}

/**
 * I don't think this is used
 * @param driver
 * @param type
 * @param message
 * @returns {Promise<void>}
 */
async function passMessageToBrowser(driver, type, message) {
    const f = () => {
        const {type, message} = arguments[0];
        let s = `$${type}`;
        if (!seleniumContext[s]) {
            let message1 = `Unknown context key ${s}`;
            window.prompt(message1);
        }
        $.toast(`${type} ${message}`);
        window.seleniumContext[s].next(message);
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

module.exports = {
    DriverObs
};
