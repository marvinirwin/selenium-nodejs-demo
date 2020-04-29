import {BehaviorSubject, combineLatest, Observable, Subject} from "rxjs";
import {map, withLatestFrom} from "rxjs/operators";

export class StoryManager {
    activeStoryIndex$: BehaviorSubject<number | undefined> = new BehaviorSubject<number | undefined>(undefined);
    stories$: BehaviorSubject<Story[]> = new BehaviorSubject<Story[]>([]);
    newAction$: Subject<Action> = new Subject();
    allSelectors$: BehaviorSubject<StoryMap> = new BehaviorSubject<StoryMap>({});
    newDefinition$: Subject<Definition> = new Subject();
    executeStory$: Subject<any> = new Subject();
    activeStory$: Observable<Story | undefined>;

    constructor() {

        this.stories$.subscribe(s => {
            if (s.length && this.activeStoryIndex$.getValue() === undefined) {
                this.activeStoryIndex$.next(0);
            }
        });

        this.activeStory$ = combineLatest([this.activeStoryIndex$, this.stories$]).pipe(
            map(([index, stories]) => index !== undefined ? stories[index] : undefined)
        );
        // Update the active story in case of a new definition

        this.newDefinition$.pipe(
            withLatestFrom(this.activeStory$)
        ).subscribe(([newDef, activeStory$]) => {
            if (activeStory$) {
                this.addDefinitionToStory(activeStory$, newDef);
            }  else {
                this.createNewStory([newDef])
            }
        });

        // Update the active story in case of a new action
        this.newAction$.pipe(
            withLatestFrom(this.activeStory$)
        ).subscribe(([newAction, activeStory$]) => {
            if (activeStory$) {
                // add action to story
                activeStory$.next(activeStory$.getValue().concat([newAction]));
            } else {
                this.createNewStory([newAction])
            }
        })
        // Add a story when we
        // Now there is active story, let's do story modification

        // Now put some demo data in here

    }

    private addDefinitionToStory(story$: BehaviorSubject<StoryEl[]>, newDef: Definition) {
        let value: StoryEl[] = story$.getValue();
        let value1 = [newDef, ...value];
        story$.next(value1)
    }

    /**
     *
     */
    async setupRecorder() {
        const handler = (e: Event) => {
            // @ts-ignore
            let ek: KeyboardEvent = e;
            switch (e.type) {
                case "click":
                    // $.toast(`responding to click shift:${e.shiftKey}`);
                    // @ts-ignore
                    this.handleClickEvent(e);
                    return;
                case "keydown":
                    // $.toast(`key: ${e.key} alt: ${e.altKey} ctrl: ${e.ctrlKey}`);
                    if (ek.key === 'e' && ek.ctrlKey) {
                        this.executeStory$.next(1);
                    }
                    /*
                                        if (ek.target.className === 'name-selector-prompt' && ek.key === "Enter") {
                                            let newName = e.target.value;
                                            const p = e.target.placeholder;
                                            let newVar = {
                                                type: "NAME_SELECTOR",
                                                sentence: `${newName} is ${p}.`
                                            };
                                            e.target.remove();
                                            this.newDefinition$.next({
                                                selector: s,
                                                subjectName: newName,
                                                sentence: `${s} is ${newName}`,
                                                type: 'DEFINITION'
                                            })
                                        }
                    */
                    return;
                case "keypress":
                // Two things cause the keybuffer to flush.  Losing focus, or not typing for a second
                /*
                                    window.keyBuffer += e.key;
                                    window.keyBufferLastHit = new Date();
                                    return ;
                */
                default:
                    return;
            }


            /**
             * Set an interval to flush the keybuffer
             * If we have to flush the keybuffer manually, this means that the user stopped typing and never unfocused the element
             */
            /*
                        setInterval(() => {
                            const activeEl = document.activeElement;
                            let s = unique(activeEl);
                            const map = JSON.parse(window.seleniumContext.uniqueNameMap$.v);
                            if (map[s]) {
                                window.prompt(s);
                            } else {
                                ''
                            }
                        })
            */
        };

        document.onkeydown = handler;
        document.onclick = handler;
    }

    private handleClickEvent(e: MouseEvent) {
        if (!e.target) return;
        // @ts-ignore
        if (e.target.className === 'name-selector-prompt') {
        }
        // For now only record things with the shift key
        if (!e.shiftKey) {
        }
        let s: string = unique(e.target);
        // Oh, I never did figure out a way to get definitions
        // I gotta keep a definitionMap up beside the story$

        let elementStoryName = this.allSelectors$.getValue()[s];
        if (!elementStoryName) {
            this.prompt(s).then((def: Definition) => {
                this.newDefinition$.next(def)
            });
        } else if (elementStoryName) {
            this.newAction$.next(Action.createAction(`Click the ${s}.`))
        }
    }

    private prompt(selector: string): Promise<Definition> {
        return new Promise(resolve => {
            const s = prompt(`Name of ${selector}`);
            if (s) {
                resolve(Definition.createDefinition(`${s} is ${selector}`));
            }
        })
    }

    private createNewStory(definitions: StoryEl[]) {
        this.stories$.next(
            this.stories$.getValue().concat(
                new BehaviorSubject(definitions)
            )
        )
    }
}
