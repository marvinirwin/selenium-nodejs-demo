const webdriver = require('selenium-webdriver');

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
        console.info(process.env.PATH);
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
}
