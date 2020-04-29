import {StoryManager} from "./StoryManager";
import React, {useState} from "react";
import {useObservable} from "./useObservable";
import {BehaviorSubject} from "rxjs";
import {Story} from "./common";
import {ShowStoryList} from "./components/StoryList";

export default function RealApp({storyManager}: { storyManager: StoryManager }) {
    const s: StoryManager = storyManager;
    /**
     * @class {SeleniumContext}
     */
        // @ts-ignore
    const [ctx, setCtx] = useState(window.seleniumContext)
    const [activeIndex] = useObservable<number | undefined>(s.activeStoryIndex$, s.activeStoryIndex$.getValue());
    const [stories] = useObservable<Story[]>(s.stories$, s.stories$.getValue());
    const [activeStory] = useObservable<Story | undefined>(s.activeStory$, undefined); // TODO there is no default value
    // Is that going to hurt anything?

    if (activeStory instanceof BehaviorSubject) {

    }
    return <div>
        {stories instanceof Array
        && <ShowStoryList
            stories={stories}
            activeStory={activeStory instanceof BehaviorSubject ? activeStory : undefined}
        />
        }

    </div>
}
