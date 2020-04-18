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
async function createSentenceListAndInputBox(d) {
    function f() {
        const containerEl = document.createElement('div');
        const textEl = document.createElement('textarea');
        const storyEl = document.createElement('ol');
        textEl.onchange = _.debounce(e => {
            debugger;
            // TODO check that this innerText is the right thing to look for
            // Also, this should probably be debounced
            // I could use lodash
            // Yeah I should load lodash into the browser
            window.seleniumContext.story$.next(e.target.innerText);
        }, 1000);

        containerEl.appendChild(textEl);
        containerEl.appendChild(storyEl);
        storyEl.id = 'user-story-element';
        containerEl.style.top = '0';
        containerEl.style.position = 'fixed';
        // storyEl.style.backgroundColor = 'black';
        containerEl.style.minHeight = '100px';
        containerEl.style.minWidth = '100px';
        document.body.appendChild(containerEl);

        window.seleniumContext.story$.subscribe(v => {
            [...storyEl.children].forEach(c => {
                c.remove();
            });
            let split = v.split('\n');
            for (let i = 0; i < split.length; i++) {
                const splitElement = split[i];
                const el = document.createElement('li');
                el.className = 'story-el';
                el.textContent = splitElement;
                storyEl.appendChild(el);
            }
        });
    }

    await d.executeScript(f);
    return 1;
}

module.exports = {
    prompt,
    createSentenceListAndInputBox
};