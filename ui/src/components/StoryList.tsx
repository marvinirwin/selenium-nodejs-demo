import {BehaviorSubject} from "rxjs";
import React from "react";
import {Story, StoryEl} from "../common";

export function ShowStoryList({stories, activeStory}: {stories: Story[], activeStory: BehaviorSubject<StoryEl[]> | undefined}) {
    return <div>
        {stories.map(s =>
            <div style={{
                border: '1px solid black',
                backgroundColor: s === activeStory ? 'green' : 'white'
            }}>
                {s.getValue().map(sentence => <div>{sentence}</div>)}
            </div>
        )}
    </div>;
}
