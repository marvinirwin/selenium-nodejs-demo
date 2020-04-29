import {BehaviorSubject, Observable, Subject} from "rxjs";
import {useEffect, useState} from "react";
import nearley from "nearley";
import * as grammar from "./grammar/grammar";

export type StoryEl = Action | Definition
export type Story  = BehaviorSubject < StoryEl[] >;

export interface StoryMap {
    [key: string]: StoryEl
}

export function UseObs<T>($o: Observable<T>, init: T): [T, (arg0: T) => void] {
    const [v, setV] = useState(init);
    useEffect(() => {
        $o.subscribe(v => setV(v));
    }, []);
    return [v, setV];
}

export function parseSentence(sentence: string): Action | Definition {
    // @ts-ignore
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(sentence);
    let value = parser.results;
    if (!value[0]) {
        console.log(sentence);
        throw new Error(`Could not parse sentence "${sentence}"`);
    }
    const t = value[0][0];
    Object.keys(t).forEach(k => {
        // This is a weird hack because sometimes elements are arrays which should not be
        if (Array.isArray(t[k])) {
            t[k] = t[k][0];
        }
    });

    // console.log(JSON.stringify(value, null, /**/'\t'));
    let newVar = {...t, sentence};
    if (newVar.selector) {
        return new Definition(newVar.selector, newVar.subjectName, newVar.sentence);
        // This means it's a definition object
    } else {
        // This means it's an action object
        return new Action(newVar.noun, newVar.sentence, newVar.verb);
    }
}

export class Definition {
    constructor(public selector: string, public subjectName: string, public sentence: string) {
    }
    static createDefinition(sentence: string): Definition {
        const ret = parseSentence(sentence);
        if (ret instanceof Definition) {
            return ret;
        } else {
            throw new Error(`Sentence: "${sentence}" is not a Definition`);
        }
    }
}

export class Action {
    constructor(public noun: string, public sentence: string, public verb: string) {
    }

    static createAction(sentence: string): Action {
        const ret = parseSentence(sentence);
        if (ret instanceof Action) {
            return ret;
        } else {
            throw new Error(`Sentence: "${sentence}" is not an Action`);
        }
    }
}

export class SeleniumContext {
    private story$: BehaviorSubject<string>;
    private keydown$: Subject<unknown>;
    private click$: Subject<unknown>;
    private addAction$: Subject<unknown>;
    private addDefinition$: Subject<unknown>;
    private executeStory$: Subject<unknown>;
    private unit_test_bh$: BehaviorSubject<string>;
    private uniqueNameMap$: BehaviorSubject<string>;

    constructor() {
        this.story$ = new BehaviorSubject('');
        this.keydown$ = new Subject();
        this.click$ = new Subject();
        this.addAction$ = new Subject();
        this.addDefinition$ = new Subject();
        this.executeStory$ = new Subject();
        this.unit_test_bh$ = new BehaviorSubject('');
        this.uniqueNameMap$ = new BehaviorSubject('{}');
    }
}

